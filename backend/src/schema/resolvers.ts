import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { pool } from '../db/client.js';
import { signToken, type TokenPayload } from '../auth/jwt.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../lib/cache.js';

export interface ApolloContext {
  user: TokenPayload | null;
}

function requireAuth(ctx: ApolloContext): TokenPayload {
  if (!ctx.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user;
}

function requireRole(ctx: ApolloContext, role: TokenPayload['role']): TokenPayload {
  const user = requireAuth(ctx);
  if (user.role !== role && user.role !== 'Admin') {
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
}

const POINTS_PER_STEP = 10;
const BONUS_POINTS_QUEST_COMPLETE = 50;

export const resolvers = {
  Query: {
    async me(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT id, email, display_name, role, points_balance, paid_status
           FROM users WHERE id = $1`,
        [user.userId],
      );
      if (!rows[0]) return null;
      return mapUser(rows[0]);
    },

    async teacherClasses(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const cacheKey = `tc:${user.userId}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return JSON.parse(cached);
      const sel = `
        SELECT ac.id, ac.name, ac.subject, ac.total_steps, rc.grade,
               ac.active_task_id, ac.active_task_format, ac.active_task_due_date,
               lt.title AS active_task_title
          FROM academic_classes ac
          JOIN register_classes rc ON rc.id = ac.register_class_id
          LEFT JOIN learning_tasks lt ON lt.id = ac.active_task_id`;
      const { rows } = user.role === 'Admin'
        ? await pool.query(`${sel} ORDER BY ac.name`)
        : await pool.query(`${sel} WHERE ac.teacher_id = $1 ORDER BY ac.name`, [user.userId]);
      const result = rows.map(r => ({
        id: r.id,
        name: r.name,
        subject: r.subject,
        totalSteps: r.total_steps,
        grade: r.grade,
        activeTaskId: r.active_task_id ?? null,
        activeTaskTitle: r.active_task_title ?? null,
        activeTaskFormat: r.active_task_format ?? null,
        activeTaskDueDate: r.active_task_due_date
          ? new Date(r.active_task_due_date).toISOString().split('T')[0]
          : null,
      }));
      await cacheSet(cacheKey, JSON.stringify(result), 30);
      return result;
    },

    async classProgress(_: unknown, { academicClassId }: { academicClassId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `SELECT lp.learner_id, u.display_name, u.email,
                lp.current_step, lp.is_locked, ac.total_steps
           FROM learner_progress lp
           JOIN users u ON u.id = lp.learner_id
           JOIN academic_classes ac ON ac.id = lp.academic_class_id
          WHERE lp.academic_class_id = $1
          ORDER BY lp.is_locked DESC, lp.current_step DESC`,
        [academicClassId],
      );
      return rows.map(r => ({
        learnerId: r.learner_id,
        displayName: r.display_name,
        email: r.email,
        currentStep: r.current_step,
        isLocked: r.is_locked,
        totalSteps: r.total_steps,
      }));
    },

    async myProgress(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT lp.id, lp.learner_id, lp.academic_class_id, lp.current_step, lp.is_locked,
                ac.name AS class_name, ac.subject, ac.total_steps
           FROM learner_progress lp
           JOIN academic_classes ac ON ac.id = lp.academic_class_id
          WHERE lp.learner_id = $1
          ORDER BY ac.name`,
        [user.userId],
      );
      return rows.map((row) => ({
        id: row.id,
        learnerId: row.learner_id,
        academicClassId: row.academic_class_id,
        currentStep: row.current_step,
        isLocked: row.is_locked,
        className: row.class_name,
        subject: row.subject,
        totalSteps: row.total_steps,
      }));
    },

    async myTeacherMessages(_: unknown, { limit = 50 }: { limit?: number }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows: teacherRows } = await pool.query(
        `SELECT ac.teacher_id FROM learner_progress lp
           JOIN academic_classes ac ON ac.id = lp.academic_class_id
          WHERE lp.learner_id = $1 LIMIT 1`,
        [user.userId],
      );
      if (!teacherRows[0]) return [];
      const teacherId = teacherRows[0].teacher_id;
      const convId = await findIndividualConversation(user.userId, teacherId);
      if (!convId) return [];
      const { rows } = await pool.query(
        `SELECT m.id, m.sender_id, u.display_name AS sender_name, m.content, m.sent_at
           FROM messages m
           JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = $1
          ORDER BY m.sent_at DESC
          LIMIT $2`,
        [convId, limit],
      );
      return rows.map(r => mapDirectMessage(r, user.userId));
    },

    async learnerMessages(_: unknown, { learnerId, limit = 50 }: { learnerId: string; limit?: number }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const convId = await findIndividualConversation(user.userId, learnerId);
      if (!convId) return [];
      const { rows } = await pool.query(
        `SELECT m.id, m.sender_id, u.display_name AS sender_name, m.content, m.sent_at
           FROM messages m
           JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = $1
          ORDER BY m.sent_at DESC
          LIMIT $2`,
        [convId, limit],
      );
      return rows.map(r => mapDirectMessage(r, user.userId));
    },

    async myConversations(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const cacheKey = `convs:${user.userId}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return JSON.parse(cached);
      const { rows } = await pool.query(
        `SELECT
           c.id,
           c.type,
           COALESCE(g.name, u.display_name) AS name,
           (
             SELECT COUNT(*)::int FROM messages msg
             LEFT JOIN message_read_status mrs ON mrs.message_id = msg.id AND mrs.user_id = $1
             WHERE msg.conversation_id = c.id AND msg.sender_id != $1 AND mrs.message_id IS NULL
           ) AS unread
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
         LEFT JOIN group_chat_metadata g ON g.conversation_id = c.id
         LEFT JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
         LEFT JOIN users u ON u.id = cp2.user_id AND c.type = 'individual'
         LEFT JOIN LATERAL (
           SELECT sent_at FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1
         ) last_msg ON true
         ORDER BY last_msg.sent_at DESC NULLS LAST`,
        [user.userId],
      );
      const result = rows.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name ?? '',
        online: false,
        memberCount: r.type === 'group' ? null : undefined,
        unread: r.unread ?? 0,
        messages: [],
      }));
      await cacheSet(cacheKey, JSON.stringify(result), 5);
      return result;
    },

    async conversationMessages(
      _: unknown,
      { conversationId, limit = 50, offset = 0 }: { conversationId: string; limit?: number; offset?: number },
      ctx: ApolloContext,
    ) {
      const user = requireAuth(ctx);
      const cacheKey = `msgs:${conversationId}:${user.userId}:${limit}:${offset}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return JSON.parse(cached);
      const { rows } = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_id, u.display_name AS sender_name,
                m.content, m.context_link, m.sent_at,
                EXISTS (
                  SELECT 1 FROM message_read_status mrs
                  WHERE mrs.message_id = m.id AND mrs.user_id = $2
                ) AS read
           FROM messages m
           JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = $1
          ORDER BY m.sent_at ASC
          LIMIT $3 OFFSET $4`,
        [conversationId, user.userId, limit, offset],
      );
      const result = rows.map(r => ({
        id: String(r.id),
        conversationId: r.conversation_id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        body: r.content,
        time: new Date(r.sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
        contextLink: r.context_link ?? null,
        read: Boolean(r.read),
      }));
      await cacheSet(cacheKey, JSON.stringify(result), 4);
      return result;
    },

    async myTaskGroup(_: unknown, { academicClassId }: { academicClassId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT tg.id, tg.academic_class_id, tg.conversation_id, tg.session_date
           FROM task_groups tg
           JOIN task_group_members tgm ON tgm.group_id = tg.id AND tgm.learner_id = $1
          WHERE tg.academic_class_id = $2 AND tg.session_date = CURRENT_DATE
          LIMIT 1`,
        [user.userId, academicClassId],
      );
      if (!rows[0]) return null;
      const group = rows[0];
      const { rows: members } = await pool.query(
        `SELECT tgm.learner_id, u.display_name, tgm.role
           FROM task_group_members tgm
           JOIN users u ON u.id = tgm.learner_id
          WHERE tgm.group_id = $1`,
        [group.id],
      );
      return {
        id: group.id,
        academicClassId: group.academic_class_id,
        conversationId: group.conversation_id,
        sessionDate: group.session_date,
        members: members.map(m => ({ learnerId: m.learner_id, displayName: m.display_name, role: m.role })),
      };
    },

    async myRegisterClass(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const { rows: classRows } = await pool.query(
        `SELECT id, name, grade FROM register_classes WHERE teacher_id = $1 LIMIT 1`,
        [user.userId],
      );
      if (!classRows[0]) return null;
      const cls = classRows[0];
      const { rows: learnerRows } = await pool.query(
        `SELECT u.id AS learner_id, u.display_name,
                COALESCE(re.status, 'unmarked') AS status, re.marked_at
           FROM (SELECT DISTINCT e.learner_id FROM enrollments e WHERE e.register_class_id = $1) enrolled
           JOIN users u ON u.id = enrolled.learner_id
           LEFT JOIN register_entries re
                  ON re.learner_id = u.id AND re.register_class_id = $1 AND re.date = CURRENT_DATE
          ORDER BY u.display_name`,
        [cls.id],
      );
      return {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        learners: learnerRows.map(r => ({
          learnerId: r.learner_id,
          displayName: r.display_name,
          status: r.status,
          markedAt: r.marked_at ? new Date(r.marked_at).toISOString() : null,
        })),
      };
    },

    async registerChatMessages(_: unknown, { registerClassId, limit = 60 }: { registerClassId: string; limit?: number }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT rcm.id, rcm.sender_id, u.display_name AS sender_name, rcm.body, rcm.sent_at
           FROM register_chat_messages rcm
           JOIN users u ON u.id = rcm.sender_id
          WHERE rcm.register_class_id = $1
          ORDER BY rcm.sent_at DESC
          LIMIT $2`,
        [registerClassId, limit],
      );
      return rows.map(r => ({
        id: String(r.id),
        senderId: r.sender_id,
        senderName: r.sender_name,
        body: r.body,
        sentAt: new Date(r.sent_at).toISOString(),
        fromMe: r.sender_id === user.userId,
      }));
    },

    async registerNotices(_: unknown, { registerClassId }: { registerClassId: string }, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT n.id, n.body, n.pinned, n.created_at, u.display_name AS author_name
           FROM notices n
           JOIN users u ON u.id = n.teacher_id
          WHERE n.register_class_id = $1
          ORDER BY n.pinned DESC, n.created_at DESC`,
        [registerClassId],
      );
      return rows.map(r => ({
        id: r.id,
        body: r.body,
        pinned: r.pinned,
        createdAt: new Date(r.created_at).toISOString(),
        authorName: r.author_name,
      }));
    },

    async shopItems(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT
           si.id, si.name, si.item_type, si.subtype, si.theme_compatibility,
           si.cost, si.description, si.tag, si.scope, si.asset_path,
           (li.id IS NOT NULL)           AS owned,
           COALESCE(li.is_active, false) AS active
         FROM shop_items si
         LEFT JOIN learner_inventory li
               ON li.item_id = si.id AND li.learner_id = $1
         ORDER BY si.cost DESC`,
        [user.userId],
      );
      return rows.map(mapShopItem);
    },

    async myInventory(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT si.id, si.name, si.item_type, si.subtype, si.theme_compatibility,
                si.cost, si.description, si.tag, si.scope, si.asset_path,
                true AS owned, li.is_active AS active
           FROM learner_inventory li
           JOIN shop_items si ON si.id = li.item_id
          WHERE li.learner_id = $1
          ORDER BY li.purchased_at DESC`,
        [user.userId],
      );
      return rows.map(mapShopItem);
    },

    async myRegisterView(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      // Find the learner's register class via their enrollment
      const { rows: classRows } = await pool.query(
        `SELECT rc.id, rc.name, rc.grade,
                COALESCE(re.status, 'unmarked') AS my_status
           FROM enrollments e
           JOIN register_classes rc ON rc.id = e.register_class_id
           LEFT JOIN register_entries re
                  ON re.register_class_id = rc.id
                 AND re.learner_id = $1
                 AND re.date = CURRENT_DATE
          WHERE e.learner_id = $1
          LIMIT 1`,
        [user.userId],
      );
      if (!classRows[0]) return null;
      const cls = classRows[0];
      // Full class roster with today's attendance
      const { rows: roster } = await pool.query(
        `SELECT u.id AS learner_id, u.display_name,
                COALESCE(re.status, 'unmarked') AS status, re.marked_at
           FROM (SELECT DISTINCT e2.learner_id FROM enrollments e2 WHERE e2.register_class_id = $1) enrolled
           JOIN users u ON u.id = enrolled.learner_id
           LEFT JOIN register_entries re
                  ON re.learner_id = u.id
                 AND re.register_class_id = $1
                 AND re.date = CURRENT_DATE
          ORDER BY u.display_name`,
        [cls.id],
      );
      return {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        myStatus: cls.my_status,
        roster: roster.map(r => ({
          learnerId: r.learner_id,
          displayName: r.display_name,
          status: r.status,
          markedAt: r.marked_at ? new Date(r.marked_at).toISOString() : null,
        })),
      };
    },

    async myAttendanceHistory(_: unknown, { limit = 30 }: { limit?: number }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT re.date, re.status, re.marked_at
           FROM register_entries re
          WHERE re.learner_id = $1
          ORDER BY re.date DESC
          LIMIT $2`,
        [user.userId, limit],
      );
      return rows.map(r => ({
        date: (r.date instanceof Date ? r.date.toISOString() : String(r.date)).split('T')[0],
        status: r.status,
        markedAt: r.marked_at ? new Date(r.marked_at).toISOString() : null,
      }));
    },

    async myClassmates(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      // Returns all other learners in the same academic classes + their teachers
      const { rows } = await pool.query(
        `SELECT DISTINCT u.id, u.display_name, u.role
           FROM enrollments e
           JOIN academic_classes ac ON ac.id = e.academic_class_id
           -- Other learners in the same class
           JOIN enrollments e2 ON e2.academic_class_id = ac.id AND e2.learner_id != $1
           JOIN users u ON u.id = e2.learner_id
          WHERE e.learner_id = $1
          UNION
         SELECT DISTINCT u.id, u.display_name, u.role
           FROM enrollments e
           JOIN academic_classes ac ON ac.id = e.academic_class_id
           JOIN users u ON u.id = ac.teacher_id
          WHERE e.learner_id = $1
          ORDER BY display_name`,
        [user.userId],
      );
      return rows.map(r => ({ id: r.id, displayName: r.display_name, role: r.role }));
    },

    async allStaff(_: unknown, __: unknown, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT id, display_name, role FROM users WHERE role IN ('Teacher', 'Admin') ORDER BY display_name`,
      );
      return rows.map(r => ({ id: r.id, displayName: r.display_name, role: r.role }));
    },

    async staffMessages(_: unknown, { limit = 100 }: { limit?: number }, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT sm.id, sm.sender_id, u.display_name AS sender_name, sm.body, sm.is_speaker_post, sm.sent_at
           FROM staff_messages sm
           JOIN users u ON u.id = sm.sender_id
          ORDER BY sm.sent_at ASC
          LIMIT $1`,
        [limit],
      );
      return rows.map(r => ({
        id: String(r.id),
        senderId: r.sender_id,
        senderName: r.sender_name,
        body: r.body,
        isSpeakerPost: r.is_speaker_post,
        sentAt: new Date(r.sent_at).toISOString(),
      }));
    },

    async speakerMessages(_: unknown, { limit = 100 }: { limit?: number }, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT sm.id, sm.sender_id, u.display_name AS sender_name, sm.body, sm.is_speaker_post, sm.sent_at
           FROM staff_messages sm
           JOIN users u ON u.id = sm.sender_id
          WHERE sm.is_speaker_post = true
          ORDER BY sm.sent_at ASC
          LIMIT $1`,
        [limit],
      );
      return rows.map(r => ({
        id: String(r.id),
        senderId: r.sender_id,
        senderName: r.sender_name,
        body: r.body,
        isSpeakerPost: r.is_speaker_post,
        sentAt: new Date(r.sent_at).toISOString(),
      }));
    },

    async allAnnouncements(_: unknown, __: unknown, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT a.id, a.created_by, u.display_name AS creator_name, a.body, a.target, a.pinned, a.created_at
           FROM announcements a
           JOIN users u ON u.id = a.created_by
          ORDER BY a.pinned DESC, a.created_at DESC`,
      );
      return rows.map(r => ({
        id: String(r.id),
        createdById: r.created_by,
        createdBy: r.creator_name,
        body: r.body,
        target: r.target,
        pinned: r.pinned,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },

    async myAnnouncements(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      // Find learner's grade via their register class enrollment
      const { rows: gradeRows } = await pool.query(
        `SELECT rc.grade FROM enrollments e
           JOIN register_classes rc ON rc.id = e.register_class_id
          WHERE e.learner_id = $1 LIMIT 1`,
        [user.userId],
      );
      const grade = gradeRows[0]?.grade?.toString() ?? null;
      const { rows } = await pool.query(
        `SELECT a.id, a.created_by, u.display_name AS creator_name, a.body, a.target, a.pinned, a.created_at
           FROM announcements a
           JOIN users u ON u.id = a.created_by
          WHERE a.target = 'all'
             OR ($1::text IS NOT NULL AND string_to_array(a.target, ',') @> ARRAY[$1::text])
          ORDER BY a.pinned DESC, a.created_at DESC`,
        [grade],
      );
      return rows.map(r => ({
        id: String(r.id),
        createdById: r.created_by,
        createdBy: r.creator_name,
        body: r.body,
        target: r.target,
        pinned: r.pinned,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },

    async staffroomState(_: unknown, __: unknown, ctx: ApolloContext) {
      requireAuth(ctx);
      const { rows } = await pool.query(
        `SELECT ss.current_speaker_id, u.display_name AS speaker_name
           FROM staffroom_state ss
           LEFT JOIN users u ON u.id = ss.current_speaker_id
          WHERE ss.id = 1`,
      );
      return {
        speakerId: rows[0]?.current_speaker_id ?? null,
        speakerName: rows[0]?.speaker_name ?? null,
      };
    },

    // ── Learning Tasks ───────────────────────────────────────────────────────

    async myTasks(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const blockCountExpr = `(CASE lt.template_type
        WHEN 'hql' THEN (SELECT COUNT(*) FROM task_step_blocks tsb WHERE tsb.task_id = lt.id)
        ELSE            (SELECT COUNT(*) FROM task_blocks tb WHERE tb.task_id = lt.id)
       END)`;
      const { rows } = user.role === 'Admin'
        ? await pool.query(
            `SELECT lt.*,
                    (SELECT COUNT(*) FROM task_quiz_questions tqq WHERE tqq.task_id = lt.id) AS quiz_question_count,
                    ${blockCountExpr} AS block_count
               FROM learning_tasks lt
              ORDER BY lt.created_at DESC`,
          )
        : await pool.query(
            `SELECT lt.*,
                    (SELECT COUNT(*) FROM task_quiz_questions tqq WHERE tqq.task_id = lt.id) AS quiz_question_count,
                    ${blockCountExpr} AS block_count
               FROM learning_tasks lt
              WHERE lt.created_by = $1
              ORDER BY lt.created_at DESC`,
            [user.userId],
          );
      return rows.map(mapLearningTask);
    },

    async taskCount(_: unknown, __: unknown, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const { rows } = user.role === 'Admin'
        ? await pool.query(`SELECT COUNT(*) AS n FROM learning_tasks`)
        : await pool.query(`SELECT COUNT(*) AS n FROM learning_tasks WHERE created_by = $1`, [user.userId]);
      return Number(rows[0].n);
    },

    async hqlBlocks(_: unknown, { taskId }: { taskId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `SELECT id, step_number, block_type, position, title, time_min,
                text_content, file_path, original_name, data
           FROM task_step_blocks WHERE task_id = $1 ORDER BY step_number, position`,
        [taskId],
      );
      return JSON.stringify(rows);
    },

    async generalBlocks(_: unknown, { taskId }: { taskId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `SELECT id, block_type AS type, position, title, time_min,
                file_path, original_name, data
           FROM task_blocks WHERE task_id = $1 ORDER BY position`,
        [taskId],
      );
      return JSON.stringify(rows);
    },

    async taskById(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `SELECT lt.*,
                (SELECT COUNT(*) FROM task_quiz_questions tqq WHERE tqq.task_id = lt.id) AS quiz_question_count,
                (CASE lt.template_type
                   WHEN 'hql' THEN (SELECT COUNT(*) FROM task_step_blocks tsb WHERE tsb.task_id = lt.id)
                   ELSE            (SELECT COUNT(*) FROM task_blocks tb WHERE tb.task_id = lt.id)
                 END) AS block_count
           FROM learning_tasks lt WHERE lt.id = $1`,
        [id],
      );
      return rows[0] ? mapLearningTask(rows[0]) : null;
    },

    // ── Economy Ledger ───────────────────────────────────────────────────────

    async myLedger(_: unknown, { limit }: { limit?: number }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const cap = Math.min(limit ?? 50, 200);
      const { rows } = await pool.query(
        `SELECT id, delta, reason, meta, created_at
           FROM points_ledger
          WHERE learner_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [user.userId, cap],
      );
      return rows.map((r) => ({
        id: String(r.id),
        delta: r.delta,
        reason: r.reason,
        meta: r.meta ? JSON.stringify(r.meta) : null,
        createdAt: (r.created_at as Date).toISOString(),
      }));
    },

    // ── Analytics ────────────────────────────────────────────────────────────

    async activitySummary(_: unknown, { academicClassId }: { academicClassId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `SELECT
           lp.learner_id,
           u.display_name,
           u.email,
           lp.current_step,
           ac.total_steps,
           COUNT(al.id)::int AS event_count,
           MAX(al.recorded_at) AS last_active
         FROM learner_progress lp
         JOIN users u ON u.id = lp.learner_id
         JOIN academic_classes ac ON ac.id = lp.academic_class_id
         LEFT JOIN activity_logs al ON al.learner_id = lp.learner_id AND al.class_id = lp.academic_class_id
         WHERE lp.academic_class_id = $1
         GROUP BY lp.learner_id, u.display_name, u.email, lp.current_step, ac.total_steps
         ORDER BY lp.current_step DESC, u.display_name`,
        [academicClassId],
      );
      return rows.map(r => ({
        learnerId: r.learner_id,
        displayName: r.display_name,
        email: r.email,
        currentStep: r.current_step,
        totalSteps: r.total_steps,
        eventCount: r.event_count,
        lastActive: r.last_active ? (r.last_active as Date).toISOString() : null,
      }));
    },

    // ── Admin Queries ────────────────────────────────────────────────────────

    async adminUsers(_: unknown, { role }: { role?: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      const { rows } = role
        ? await pool.query(
            `SELECT id, email, display_name, role, paid_status FROM users WHERE role = $1 ORDER BY display_name`,
            [role],
          )
        : await pool.query(
            `SELECT id, email, display_name, role, paid_status FROM users ORDER BY display_name`,
          );
      return rows.map(r => ({ id: r.id, email: r.email, displayName: r.display_name, role: r.role, paidStatus: r.paid_status }));
    },

    async adminRegisterClasses(_: unknown, __: unknown, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(`
        SELECT rc.id, rc.name, rc.grade, rc.teacher_id,
               u.display_name AS teacher_name,
               (SELECT COUNT(*) FROM academic_classes ac WHERE ac.register_class_id = rc.id)::int AS academic_class_count
          FROM register_classes rc
          LEFT JOIN users u ON u.id = rc.teacher_id
         ORDER BY rc.grade, rc.name
      `);
      return rows.map(r => ({
        id: r.id, name: r.name, grade: r.grade,
        teacherId: r.teacher_id ?? null,
        teacherName: r.teacher_name ?? null,
        academicClassCount: r.academic_class_count,
      }));
    },

    async adminAcademicClasses(_: unknown, __: unknown, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(`
        SELECT ac.id, ac.name, ac.subject, ac.total_steps,
               ac.register_class_id, rc.name AS register_class_name, rc.grade,
               ac.teacher_id, u.display_name AS teacher_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.academic_class_id = ac.id)::int AS enrolled_count
          FROM academic_classes ac
          JOIN register_classes rc ON rc.id = ac.register_class_id
          LEFT JOIN users u ON u.id = ac.teacher_id
         ORDER BY rc.grade, ac.subject, ac.name
      `);
      return rows.map(r => ({
        id: r.id, name: r.name, subject: r.subject, grade: r.grade,
        totalSteps: r.total_steps,
        registerClassId: r.register_class_id,
        registerClassName: r.register_class_name,
        teacherId: r.teacher_id ?? null,
        teacherName: r.teacher_name ?? null,
        enrolledCount: r.enrolled_count,
      }));
    },

    async adminClassEnrollments(_: unknown, { academicClassId }: { academicClassId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(`
        SELECT u.id, u.display_name, u.email
          FROM enrollments e
          JOIN users u ON u.id = e.learner_id
         WHERE e.academic_class_id = $1
         ORDER BY u.display_name
      `, [academicClassId]);
      return rows.map(r => ({ learnerId: r.id, learnerName: r.display_name, learnerEmail: r.email }));
    },

    async customThemes() {
      const { rows } = await pool.query(
        `SELECT id, name, display_name, color_primary, color_secondary, color_accent,
                color_text, color_bg_overlay, status, shop_item_id, created_at
           FROM custom_themes WHERE status IN ('active', 'draft') ORDER BY created_at ASC`,
      );
      return rows.map(r => ({
        id: r.id, name: r.name, displayName: r.display_name,
        colorPrimary: r.color_primary, colorSecondary: r.color_secondary,
        colorAccent: r.color_accent, colorText: r.color_text, colorBgOverlay: r.color_bg_overlay,
        status: r.status, shopItemId: r.shop_item_id ?? null,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },

    async adminThemes(_: unknown, __: unknown, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(
        `SELECT id, name, display_name, color_primary, color_secondary, color_accent,
                color_text, color_bg_overlay, status, shop_item_id, created_at
           FROM custom_themes ORDER BY created_at ASC`,
      );
      return rows.map(r => ({
        id: r.id, name: r.name, displayName: r.display_name,
        colorPrimary: r.color_primary, colorSecondary: r.color_secondary,
        colorAccent: r.color_accent, colorText: r.color_text, colorBgOverlay: r.color_bg_overlay,
        status: r.status, shopItemId: r.shop_item_id ?? null,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },
  },

  Mutation: {
    async login(_: unknown, { email, password }: { email: string; password: string }) {
      const { rows } = await pool.query(
        `SELECT id, email, display_name, role, points_balance, paid_status, password_hash
           FROM users WHERE email = $1`,
        [email.toLowerCase().trim()],
      );

      const dbUser = rows[0];
      const valid = dbUser && (await bcrypt.compare(password, dbUser.password_hash));

      if (!valid) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const token = signToken({ userId: dbUser.id, role: dbUser.role });
      return { token, user: mapUser(dbUser) };
    },

    async unlockStep(
      _: unknown,
      { learnerId, academicClassId }: { learnerId: string; academicClassId: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `UPDATE learner_progress
            SET is_locked = false, updated_at = now()
          WHERE learner_id = $1 AND academic_class_id = $2
          RETURNING id, learner_id, academic_class_id, current_step, is_locked`,
        [learnerId, academicClassId],
      );
      if (!rows[0]) throw new GraphQLError('Progress record not found', { extensions: { code: 'NOT_FOUND' } });
      return mapProgress(rows[0]);
    },

    async advanceStep(_: unknown, { academicClassId }: { academicClassId: string }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Learner');

      const { rows } = await pool.query(
        `SELECT lp.id, lp.current_step, lp.is_locked, ac.total_steps
           FROM learner_progress lp
           JOIN academic_classes ac ON ac.id = lp.academic_class_id
          WHERE lp.learner_id = $1 AND lp.academic_class_id = $2`,
        [user.userId, academicClassId],
      );

      const progress = rows[0];
      if (!progress) throw new GraphQLError('Not enrolled in this class', { extensions: { code: 'NOT_FOUND' } });
      if (progress.is_locked) throw new GraphQLError('Step is locked — wait for your teacher to unlock it', { extensions: { code: 'LOCKED' } });
      if (progress.current_step >= progress.total_steps) throw new GraphQLError('Quest complete', { extensions: { code: 'QUEST_COMPLETE' } });

      const isLastStep = progress.current_step + 1 >= progress.total_steps;
      const pointsAwarded = POINTS_PER_STEP + (isLastStep ? BONUS_POINTS_QUEST_COMPLETE : 0);

      const { rows: updated } = await pool.query(
        `UPDATE learner_progress
            SET current_step = current_step + 1, updated_at = now()
          WHERE id = $1
          RETURNING id, learner_id, academic_class_id, current_step, is_locked`,
        [progress.id],
      );

      const { rows: userRows } = await pool.query(
        `UPDATE users SET points_balance = points_balance + $1 WHERE id = $2 RETURNING points_balance`,
        [pointsAwarded, user.userId],
      );

      await pool.query(
        `INSERT INTO points_ledger (learner_id, delta, reason, meta) VALUES ($1, $2, $3, $4)`,
        [
          user.userId,
          pointsAwarded,
          isLastStep ? 'quest_bonus' : 'step_complete',
          JSON.stringify({ academicClassId, step: progress.current_step + 1 }),
        ],
      );

      return {
        progress: mapProgress(updated[0]),
        pointsAwarded,
        pointsBalance: userRows[0].points_balance,
        questComplete: isLastStep,
      };
    },

    async purchaseItem(_: unknown, { itemId }: { itemId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows: itemRows } = await client.query(
          `SELECT id, name, cost FROM shop_items WHERE id = $1`, [itemId],
        );
        if (!itemRows[0]) throw new GraphQLError('Item not found', { extensions: { code: 'NOT_FOUND' } });
        const { cost, name: itemName } = itemRows[0];

        const { rows: userRows } = await client.query(
          `SELECT points_balance FROM users WHERE id = $1`, [user.userId],
        );
        if (userRows[0].points_balance < cost) {
          throw new GraphQLError('Insufficient points', { extensions: { code: 'INSUFFICIENT_POINTS' } });
        }

        const { rows: ownedRows } = await client.query(
          `SELECT id FROM learner_inventory WHERE learner_id = $1 AND item_id = $2`,
          [user.userId, itemId],
        );
        if (ownedRows[0]) throw new GraphQLError('Item already owned', { extensions: { code: 'ALREADY_OWNED' } });

        const { rows: balanceRows } = await client.query(
          `UPDATE users SET points_balance = points_balance - $1 WHERE id = $2 RETURNING points_balance`,
          [cost, user.userId],
        );
        await client.query(
          `INSERT INTO learner_inventory (learner_id, item_id, is_active) VALUES ($1, $2, false)`,
          [user.userId, itemId],
        );
        await client.query(
          `INSERT INTO points_ledger (learner_id, delta, reason, meta) VALUES ($1, $2, 'purchase', $3)`,
          [user.userId, -cost, JSON.stringify({ itemId, itemName: itemName ?? '' })],
        );

        await client.query('COMMIT');

        const { rows: full } = await pool.query(
          `SELECT si.id, si.name, si.item_type, si.subtype, si.theme_compatibility,
                  si.cost, si.description, si.tag, si.scope, si.asset_path,
                  true AS owned, false AS active
             FROM shop_items si WHERE si.id = $1`, [itemId],
        );
        return { item: mapShopItem(full[0]), pointsBalance: balanceRows[0].points_balance };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async sendToTeacher(_: unknown, { body }: { body: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows: teacherRows } = await pool.query(
        `SELECT ac.teacher_id FROM learner_progress lp
           JOIN academic_classes ac ON ac.id = lp.academic_class_id
          WHERE lp.learner_id = $1 LIMIT 1`,
        [user.userId],
      );
      if (!teacherRows[0]) throw new GraphQLError('No teacher found for this learner', { extensions: { code: 'NOT_FOUND' } });
      const convId = await findOrCreateIndividualConversation(user.userId, teacherRows[0].teacher_id);
      const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sent_at`,
        [convId, user.userId, body],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        senderId: user.userId,
        senderName: uRows[0].display_name,
        body,
        sentAt: new Date(rows[0].sent_at).toISOString(),
        fromMe: true,
      };
    },

    async sendToLearner(_: unknown, { learnerId, body }: { learnerId: string; body: string }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const convId = await findOrCreateIndividualConversation(user.userId, learnerId);
      const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sent_at`,
        [convId, user.userId, body],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        senderId: user.userId,
        senderName: uRows[0].display_name,
        body,
        sentAt: new Date(rows[0].sent_at).toISOString(),
        fromMe: true,
      };
    },

    async sendBroadcast(_: unknown, { learnerIds, body }: { learnerIds: string[]; body: string }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      if (!learnerIds.length || !body.trim()) return 0;
      for (const learnerId of learnerIds) {
        const convId = await findOrCreateIndividualConversation(user.userId, learnerId);
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
          [convId, user.userId, body.trim()],
        );
      }
      return learnerIds.length;
    },

    async createConversation(_: unknown, { participantId }: { participantId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const convId = await findOrCreateIndividualConversation(user.userId, participantId);
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [participantId]);
      const { rows: unreadRows } = await pool.query(
        `SELECT COUNT(*)::int AS unread FROM messages m
         LEFT JOIN message_read_status mrs ON mrs.message_id = m.id AND mrs.user_id = $1
         WHERE m.conversation_id = $2 AND m.sender_id != $1 AND mrs.message_id IS NULL`,
        [user.userId, convId],
      );
      await cacheDelPattern('convs:*');
      return {
        id: convId,
        type: 'individual',
        name: uRows[0]?.display_name ?? '',
        online: false,
        memberCount: null,
        unread: unreadRows[0]?.unread ?? 0,
        messages: [],
      };
    },

    async createGroupChat(_: unknown, { name, participantIds }: { name: string; participantIds: string[] }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const allParticipants = [user.userId, ...participantIds];
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`INSERT INTO conversations (type) VALUES ('group') RETURNING id`);
        const convId = rows[0].id;
        await client.query(
          `INSERT INTO group_chat_metadata (conversation_id, name, created_by) VALUES ($1, $2, $3)`,
          [convId, name, user.userId],
        );
        for (const pid of allParticipants) {
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
            [convId, pid],
          );
        }
        await client.query('COMMIT');
        return { id: convId, type: 'group', name, online: false, memberCount: allParticipants.length, unread: 0, messages: [] };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async sendMessage(
      _: unknown,
      { conversationId, body, contextLink }: { conversationId: string; body: string; contextLink?: string },
      ctx: ApolloContext,
    ) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, context_link)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sent_at`,
        [conversationId, user.userId, body, contextLink ?? null],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      // Invalidate message cache for this conversation and all conversation lists
      await Promise.all([
        cacheDelPattern(`msgs:${conversationId}:*`),
        cacheDelPattern('convs:*'),
      ]);
      return {
        id: String(rows[0].id),
        conversationId,
        senderId: user.userId,
        senderName: uRows[0].display_name,
        body,
        time: new Date(rows[0].sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
        contextLink: contextLink ?? null,
        read: false,
      };
    },

    async markConversationRead(_: unknown, { conversationId }: { conversationId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      await pool.query(
        `INSERT INTO message_read_status (message_id, user_id)
         SELECT m.id, $2 FROM messages m
         WHERE m.conversation_id = $1
           AND m.sender_id != $2
           AND NOT EXISTS (
             SELECT 1 FROM message_read_status mrs WHERE mrs.message_id = m.id AND mrs.user_id = $2
           )
         ON CONFLICT DO NOTHING`,
        [conversationId, user.userId],
      );
      await cacheDel(`convs:${user.userId}`);
      return true;
    },

    async createTaskGroup(
      _: unknown,
      { academicClassId, memberRoles }: { academicClassId: string; memberRoles: { learnerId: string; role: string }[] },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Teacher');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: convRows } = await client.query(`INSERT INTO conversations (type) VALUES ('group') RETURNING id`);
        const convId = convRows[0].id;
        const { rows: groupRows } = await client.query(
          `INSERT INTO task_groups (academic_class_id, conversation_id) VALUES ($1, $2) RETURNING id, session_date`,
          [academicClassId, convId],
        );
        const groupId = groupRows[0].id;
        for (const { learnerId, role } of memberRoles) {
          await client.query(
            `INSERT INTO task_group_members (group_id, learner_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (group_id, learner_id) DO UPDATE SET role = EXCLUDED.role`,
            [groupId, learnerId, role],
          );
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [convId, learnerId],
          );
        }
        await client.query('COMMIT');
        const members = memberRoles.map(mr => ({ learnerId: mr.learnerId, displayName: '', role: mr.role }));
        return { id: groupId, academicClassId, conversationId: convId, sessionDate: groupRows[0].session_date, members };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async assignGroupRole(
      _: unknown,
      { groupId, learnerId, role }: { groupId: string; learnerId: string; role: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `UPDATE task_group_members SET role = $3 WHERE group_id = $1 AND learner_id = $2
         RETURNING learner_id, role`,
        [groupId, learnerId, role],
      );
      if (!rows[0]) throw new GraphQLError('Member not found in group', { extensions: { code: 'NOT_FOUND' } });
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [learnerId]);
      return { learnerId: rows[0].learner_id, displayName: uRows[0].display_name, role: rows[0].role };
    },

    async markAttendance(_: unknown, { registerClassId, learnerId, status }: { registerClassId: string; learnerId: string; status: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `INSERT INTO register_entries (register_class_id, learner_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (register_class_id, learner_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_at = now()
         RETURNING *`,
        [registerClassId, learnerId, status],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [learnerId]);
      return {
        learnerId: rows[0].learner_id,
        displayName: uRows[0].display_name,
        status: rows[0].status,
        markedAt: new Date(rows[0].marked_at).toISOString(),
      };
    },

    async sendRegisterChat(_: unknown, { registerClassId, body }: { registerClassId: string; body: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(
        `INSERT INTO register_chat_messages (register_class_id, sender_id, body)
         VALUES ($1, $2, $3) RETURNING *`,
        [registerClassId, user.userId, body.trim()],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        senderId: rows[0].sender_id,
        senderName: uRows[0].display_name,
        body: rows[0].body,
        sentAt: new Date(rows[0].sent_at).toISOString(),
        fromMe: true,
      };
    },

    async createNotice(_: unknown, { registerClassId, body }: { registerClassId: string; body: string }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `INSERT INTO notices (register_class_id, teacher_id, body)
         VALUES ($1, $2, $3) RETURNING *`,
        [registerClassId, user.userId, body.trim()],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: rows[0].id,
        body: rows[0].body,
        pinned: rows[0].pinned,
        createdAt: new Date(rows[0].created_at).toISOString(),
        authorName: uRows[0].display_name,
      };
    },

    async pinNotice(_: unknown, { noticeId, pinned }: { noticeId: string; pinned: boolean }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `UPDATE notices SET pinned = $1 WHERE id = $2 RETURNING *`,
        [pinned, noticeId],
      );
      if (!rows[0]) throw new GraphQLError('Notice not found', { extensions: { code: 'NOT_FOUND' } });
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].teacher_id]);
      return {
        id: rows[0].id,
        body: rows[0].body,
        pinned: rows[0].pinned,
        createdAt: new Date(rows[0].created_at).toISOString(),
        authorName: uRows[0].display_name,
      };
    },

    async deleteNotice(_: unknown, { noticeId }: { noticeId: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      await pool.query(`DELETE FROM notices WHERE id = $1`, [noticeId]);
      return true;
    },

    async dismissClass(_: unknown, { registerClassId }: { registerClassId: string }, ctx: ApolloContext) {
      const user = requireRole(ctx, 'Teacher');
      const body = '🎒 Register complete — head to your first lesson. Have a great day!';
      const { rows } = await pool.query(
        `INSERT INTO register_chat_messages (register_class_id, sender_id, body)
         VALUES ($1, $2, $3) RETURNING *`,
        [registerClassId, user.userId, body],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        senderId: rows[0].sender_id,
        senderName: uRows[0].display_name,
        body: rows[0].body,
        sentAt: new Date(rows[0].sent_at).toISOString(),
        fromMe: true,
      };
    },

    async equipItem(_: unknown, { itemId }: { itemId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);

      const { rows: itemRows } = await pool.query(
        `SELECT id, item_type FROM shop_items WHERE id = $1`, [itemId],
      );
      if (!itemRows[0]) throw new GraphQLError('Item not found', { extensions: { code: 'NOT_FOUND' } });

      const { rows: ownedRows } = await pool.query(
        `SELECT id FROM learner_inventory WHERE learner_id = $1 AND item_id = $2`,
        [user.userId, itemId],
      );
      if (!ownedRows[0]) throw new GraphQLError('Item not owned', { extensions: { code: 'NOT_OWNED' } });

      // Deactivate all items of the same type, then activate this one
      await pool.query(
        `UPDATE learner_inventory li
            SET is_active = (li.item_id = $3)
           FROM shop_items si
          WHERE li.item_id = si.id
            AND li.learner_id = $1
            AND si.item_type = $2`,
        [user.userId, itemRows[0].item_type, itemId],
      );

      const { rows } = await pool.query(
        `SELECT si.id, si.name, si.item_type, si.subtype, si.theme_compatibility,
                si.cost, si.description, si.tag, si.scope, si.asset_path,
                true AS owned, true AS active
           FROM shop_items si WHERE si.id = $1`, [itemId],
      );
      return mapShopItem(rows[0]);
    },

    async unequipItem(_: unknown, { itemId }: { itemId: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);

      const { rows: ownedRows } = await pool.query(
        `SELECT id FROM learner_inventory WHERE learner_id = $1 AND item_id = $2`,
        [user.userId, itemId],
      );
      if (!ownedRows[0]) throw new GraphQLError('Item not owned', { extensions: { code: 'NOT_OWNED' } });

      await pool.query(
        `UPDATE learner_inventory SET is_active = false WHERE learner_id = $1 AND item_id = $2`,
        [user.userId, itemId],
      );

      const { rows } = await pool.query(
        `SELECT si.id, si.name, si.item_type, si.subtype, si.theme_compatibility,
                si.cost, si.description, si.tag, si.scope, si.asset_path,
                true AS owned, false AS active
           FROM shop_items si WHERE si.id = $1`, [itemId],
      );
      return mapShopItem(rows[0]);
    },

    async sendStaffMessage(
      _: unknown,
      { body, isSpeakerPost = false }: { body: string; isSpeakerPost?: boolean },
      ctx: ApolloContext,
    ) {
      const user = requireAuth(ctx);
      if (isSpeakerPost) {
        const { rows } = await pool.query(
          `SELECT current_speaker_id FROM staffroom_state WHERE id = 1`,
        );
        if (rows[0]?.current_speaker_id !== user.userId) {
          throw new GraphQLError('Only the current speaker can post to the speaker channel', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
      }
      const { rows } = await pool.query(
        `INSERT INTO staff_messages (sender_id, body, is_speaker_post) VALUES ($1, $2, $3)
         RETURNING id, sent_at`,
        [user.userId, body.trim(), isSpeakerPost],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        senderId: user.userId,
        senderName: uRows[0].display_name,
        body: body.trim(),
        isSpeakerPost,
        sentAt: new Date(rows[0].sent_at).toISOString(),
      };
    },

    async createAnnouncement(
      _: unknown,
      { body, target }: { body: string; target: string },
      ctx: ApolloContext,
    ) {
      const user = requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `INSERT INTO announcements (created_by, body, target) VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [user.userId, body.trim(), target],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [user.userId]);
      return {
        id: String(rows[0].id),
        createdById: user.userId,
        createdBy: uRows[0].display_name,
        body: body.trim(),
        target,
        pinned: false,
        createdAt: new Date(rows[0].created_at).toISOString(),
      };
    },

    async pinAnnouncement(_: unknown, { id, pinned }: { id: string; pinned: boolean }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows: aRows } = await pool.query(`SELECT created_by FROM announcements WHERE id = $1`, [id]);
      if (!aRows[0]) throw new GraphQLError('Announcement not found', { extensions: { code: 'NOT_FOUND' } });
      if (aRows[0].created_by !== user.userId && user.role !== 'Admin') {
        throw new GraphQLError('Only the author or an admin can pin this', { extensions: { code: 'FORBIDDEN' } });
      }
      const { rows } = await pool.query(
        `UPDATE announcements SET pinned = $1 WHERE id = $2
         RETURNING id, created_by, body, target, pinned, created_at`,
        [pinned, id],
      );
      const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].created_by]);
      return {
        id: String(rows[0].id),
        createdById: rows[0].created_by,
        createdBy: uRows[0].display_name,
        body: rows[0].body,
        target: rows[0].target,
        pinned: rows[0].pinned,
        createdAt: new Date(rows[0].created_at).toISOString(),
      };
    },

    async deleteAnnouncement(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      const { rows } = await pool.query(`SELECT created_by FROM announcements WHERE id = $1`, [id]);
      if (!rows[0]) throw new GraphQLError('Announcement not found', { extensions: { code: 'NOT_FOUND' } });
      if (rows[0].created_by !== user.userId && user.role !== 'Admin') {
        throw new GraphQLError('Only the author or an admin can delete this', { extensions: { code: 'FORBIDDEN' } });
      }
      await pool.query(`DELETE FROM announcements WHERE id = $1`, [id]);
      return true;
    },

    async assignPodium(_: unknown, { userId }: { userId?: string | null }, ctx: ApolloContext) {
      const user = requireAuth(ctx);
      if (user.role !== 'Admin') {
        throw new GraphQLError('Only admins can assign the podium', { extensions: { code: 'FORBIDDEN' } });
      }
      await pool.query(
        `UPDATE staffroom_state SET current_speaker_id = $1 WHERE id = 1`,
        [userId ?? null],
      );
      if (!userId) return { speakerId: null, speakerName: null };
      const { rows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [userId]);
      return { speakerId: userId, speakerName: rows[0]?.display_name ?? null };
    },

    // ── Learning Tasks ───────────────────────────────────────────────────────

    async saveHqlTask(
      _: unknown,
      { input, publish }: { input: HqlTaskInput; publish?: boolean | null },
      ctx: ApolloContext,
    ) {
      const user = requireRole(ctx, 'Teacher');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const taskId = input.id ?? undefined;
        const folderPath = taskId ? `tasks/${taskId}` : 'tasks/tmp';
        const totalTimeMin = input.blocks.reduce((s, b) => s + (b.timeMin ?? 0), 0);

        // Upsert the main task record
        const { rows: taskRows } = await client.query(
          `INSERT INTO learning_tasks (id, title, subject, grade, template_type, total_time_min, created_by, published, folder_path, step_labels, updated_at)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, 'hql', $5, $6, $7, $8, $9::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             subject = EXCLUDED.subject,
             grade = EXCLUDED.grade,
             total_time_min = EXCLUDED.total_time_min,
             published = EXCLUDED.published,
             folder_path = EXCLUDED.folder_path,
             step_labels = EXCLUDED.step_labels,
             updated_at = now()
           RETURNING *`,
          [taskId ?? null, input.title, input.subject, input.grade, totalTimeMin, user.userId, publish ?? false, folderPath, JSON.stringify(input.stepLabels)],
        );
        const task = taskRows[0];
        const tid = task.id as string;

        if (!taskId) {
          await client.query(`UPDATE learning_tasks SET folder_path = $1 WHERE id = $2`, [`tasks/${tid}`, tid]);
          task.folder_path = `tasks/${tid}`;
        }

        // Replace all step blocks for this task
        await client.query(`DELETE FROM task_step_blocks WHERE task_id = $1`, [tid]);
        await client.query(`DELETE FROM task_quiz_questions WHERE task_id = $1`, [tid]);

        for (const block of input.blocks) {
          const data = block.data ? JSON.parse(block.data) : null;
          await client.query(
            `INSERT INTO task_step_blocks
               (id, task_id, step_number, block_type, position, title, time_min, text_content, file_path, original_name, data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              block.id, tid, block.stepNumber, block.blockType, block.position,
              block.title ?? null, block.timeMin ?? 0, block.textContent ?? null,
              block.filePath ?? null, block.originalName ?? null,
              data,
            ],
          );

          // Persist parsed quiz questions for count / learner engine
          if (block.blockType === 'QUIZ' && data?.questions) {
            for (const q of data.questions as QuizQuestionInput[]) {
              await client.query(
                `INSERT INTO task_quiz_questions (task_id, step_number, question_number, text, options, correct_index)
                 VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
                [tid, block.stepNumber, q.number, q.text, JSON.stringify(q.options), q.correctIndex],
              );
            }
          }
        }

        await client.query('COMMIT');

        const { rows: qRows } = await client.query(
          `SELECT COUNT(*) AS n FROM task_quiz_questions WHERE task_id = $1`, [tid],
        );
        const { rows: bRows } = await client.query(
          `SELECT COUNT(*) AS n FROM task_step_blocks WHERE task_id = $1`, [tid],
        );
        return { ...mapLearningTask(task), quizQuestionCount: Number(qRows[0].n), blockCount: Number(bRows[0].n) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async saveGeneralTask(
      _: unknown,
      { input, publish }: { input: GeneralTaskInput; publish?: boolean | null },
      ctx: ApolloContext,
    ) {
      const user = requireRole(ctx, 'Teacher');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const taskId = input.id ?? undefined;
        const folderPath = `tasks/${taskId ?? 'tmp'}`;

        const { rows: taskRows } = await client.query(
          `INSERT INTO learning_tasks (id, title, subject, grade, template_type, total_time_min, created_by, published, folder_path, updated_at)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, 'general', $5, $6, $7, $8, now())
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             subject = EXCLUDED.subject,
             grade = EXCLUDED.grade,
             total_time_min = EXCLUDED.total_time_min,
             published = EXCLUDED.published,
             folder_path = EXCLUDED.folder_path,
             updated_at = now()
           RETURNING *`,
          [
            taskId ?? null,
            input.title,
            input.subject,
            input.grade,
            input.totalTimeMin,
            user.userId,
            publish ?? false,
            folderPath,
          ],
        );
        const task = taskRows[0];
        const tid = task.id as string;

        if (!taskId) {
          await client.query(
            `UPDATE learning_tasks SET folder_path = $1 WHERE id = $2`,
            [`tasks/${tid}`, tid],
          );
          task.folder_path = `tasks/${tid}`;
        }

        await client.query(`DELETE FROM task_blocks WHERE task_id = $1`, [tid]);
        await client.query(`DELETE FROM task_quiz_questions WHERE task_id = $1`, [tid]);

        for (const b of input.blocks) {
          await client.query(
            `INSERT INTO task_blocks (task_id, block_type, position, title, time_min, data, file_path, original_name)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
            [tid, b.type, b.position, b.title, b.timeMin, b.data, b.filePath ?? null, b.originalName ?? null],
          );
        }

        if (input.quizQuestions) {
          for (const q of input.quizQuestions) {
            await client.query(
              `INSERT INTO task_quiz_questions (task_id, step_number, question_number, text, options, correct_index)
               VALUES ($1, 4, $2, $3, $4::jsonb, $5)`,
              [tid, q.number, q.text, JSON.stringify(q.options), q.correctIndex],
            );
          }
        }

        await client.query('COMMIT');

        const { rows: blkRows } = await client.query(
          `SELECT COUNT(*) AS n FROM task_blocks WHERE task_id = $1`, [tid],
        );
        const { rows: qRows } = await client.query(
          `SELECT COUNT(*) AS n FROM task_quiz_questions WHERE task_id = $1`, [tid],
        );
        return { ...mapLearningTask(task), blockCount: Number(blkRows[0].n), quizQuestionCount: Number(qRows[0].n) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async publishTask(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      const { rows } = await pool.query(
        `UPDATE learning_tasks SET published = true, updated_at = now() WHERE id = $1 RETURNING *`,
        [id],
      );
      if (!rows[0]) throw new GraphQLError('Task not found', { extensions: { code: 'NOT_FOUND' } });
      const { rows: qRows } = await pool.query(
        `SELECT COUNT(*) AS n FROM task_quiz_questions WHERE task_id = $1`, [id],
      );
      const { rows: bRows } = await pool.query(
        `SELECT COUNT(*) AS n FROM task_blocks WHERE task_id = $1`, [id],
      );
      return { ...mapLearningTask(rows[0]), quizQuestionCount: Number(qRows[0].n), blockCount: Number(bRows[0].n) };
    },

    async activateTask(
      _: unknown,
      { academicClassId, taskId, format, enabledSteps, dueDate }:
        { academicClassId: string; taskId: string; format: string; enabledSteps: number[]; dueDate: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Teacher');
      await pool.query(
        `UPDATE academic_classes
            SET active_task_id = $1, active_task_format = $2,
                active_task_enabled_steps = $3::jsonb, active_task_due_date = $4
          WHERE id = $5`,
        [taskId, format, JSON.stringify(enabledSteps), dueDate, academicClassId],
      );
      await cacheDelPattern('tc:*');
      return true;
    },

    async deleteTask(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Teacher');
      await pool.query(`DELETE FROM learning_tasks WHERE id = $1`, [id]);
      return true;
    },

    // ── Admin Mutations ──────────────────────────────────────────────────────

    async adminCreateUser(
      _: unknown,
      { email, displayName, password, role }: { email: string; displayName: string; password: string; role: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role, paid_status`,
        [email.toLowerCase().trim(), hash, displayName.trim(), role],
      );
      return { id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name, role: rows[0].role, paidStatus: rows[0].paid_status };
    },

    async adminUpdateUser(
      _: unknown,
      { id, email, displayName, role, paidStatus, newPassword }:
        { id: string; email?: string; displayName?: string; role?: string; paidStatus?: boolean; newPassword?: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (email !== undefined)       { updates.push(`email = $${i++}`); values.push(email.toLowerCase().trim()); }
      if (displayName !== undefined) { updates.push(`display_name = $${i++}`); values.push(displayName.trim()); }
      if (role !== undefined)        { updates.push(`role = $${i++}`); values.push(role); }
      if (paidStatus !== undefined)  { updates.push(`paid_status = $${i++}`); values.push(paidStatus); }
      if (newPassword !== undefined && newPassword.trim()) {
        const hash = await bcrypt.hash(newPassword, 10);
        updates.push(`password_hash = $${i++}`);
        values.push(hash);
      }
      if (!updates.length) throw new GraphQLError('Nothing to update', { extensions: { code: 'BAD_REQUEST' } });
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, display_name, role, paid_status`,
        values,
      );
      if (!rows[0]) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      return { id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name, role: rows[0].role, paidStatus: rows[0].paid_status };
    },

    async adminDeleteUser(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
      return true;
    },

    async adminCreateRegisterClass(
      _: unknown,
      { name, grade, teacherId }: { name: string; grade: number; teacherId?: string | null },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(
        `INSERT INTO register_classes (name, grade, teacher_id) VALUES ($1, $2, $3) RETURNING *`,
        [name.trim(), grade, teacherId ?? null],
      );
      const tRow = rows[0].teacher_id
        ? (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].teacher_id])).rows[0]
        : null;
      return {
        id: rows[0].id, name: rows[0].name, grade: rows[0].grade,
        teacherId: rows[0].teacher_id ?? null,
        teacherName: tRow?.display_name ?? null,
        academicClassCount: 0,
      };
    },

    async adminUpdateRegisterClass(
      _: unknown,
      { id, name, grade, teacherId }: { id: string; name?: string; grade?: number; teacherId?: string | null },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined)      { updates.push(`name = $${i++}`); values.push(name.trim()); }
      if (grade !== undefined)     { updates.push(`grade = $${i++}`); values.push(grade); }
      if (teacherId !== undefined) { updates.push(`teacher_id = $${i++}`); values.push(teacherId ?? null); }
      if (!updates.length) throw new GraphQLError('Nothing to update', { extensions: { code: 'BAD_REQUEST' } });
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE register_classes SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
        values,
      );
      if (!rows[0]) throw new GraphQLError('Register class not found', { extensions: { code: 'NOT_FOUND' } });
      const tRow = rows[0].teacher_id
        ? (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].teacher_id])).rows[0]
        : null;
      const { rows: cRows } = await pool.query(
        `SELECT COUNT(*) AS n FROM academic_classes WHERE register_class_id = $1`, [id],
      );
      return {
        id: rows[0].id, name: rows[0].name, grade: rows[0].grade,
        teacherId: rows[0].teacher_id ?? null,
        teacherName: tRow?.display_name ?? null,
        academicClassCount: Number(cRows[0].n),
      };
    },

    async adminDeleteRegisterClass(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      await pool.query(`DELETE FROM register_classes WHERE id = $1`, [id]);
      return true;
    },

    async adminCreateAcademicClass(
      _: unknown,
      { name, subject, registerClassId, totalSteps, teacherId }:
        { name: string; subject: string; registerClassId: string; totalSteps: number; teacherId?: string | null },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const { rows } = await pool.query(
        `INSERT INTO academic_classes (name, subject, register_class_id, teacher_id, total_steps)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name.trim(), subject.trim(), registerClassId, teacherId ?? null, totalSteps],
      );
      const rc = (await pool.query(`SELECT name, grade FROM register_classes WHERE id = $1`, [registerClassId])).rows[0];
      const tRow = rows[0].teacher_id
        ? (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].teacher_id])).rows[0]
        : null;
      return {
        id: rows[0].id, name: rows[0].name, subject: rows[0].subject,
        grade: rc?.grade ?? 0,
        totalSteps: rows[0].total_steps,
        registerClassId: rows[0].register_class_id,
        registerClassName: rc?.name ?? '',
        teacherId: rows[0].teacher_id ?? null,
        teacherName: tRow?.display_name ?? null,
        enrolledCount: 0,
      };
    },

    async adminUpdateAcademicClass(
      _: unknown,
      { id, name, subject, totalSteps, teacherId }:
        { id: string; name?: string; subject?: string; totalSteps?: number; teacherId?: string | null },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined)       { updates.push(`name = $${i++}`); values.push(name.trim()); }
      if (subject !== undefined)    { updates.push(`subject = $${i++}`); values.push(subject.trim()); }
      if (totalSteps !== undefined) { updates.push(`total_steps = $${i++}`); values.push(totalSteps); }
      if (teacherId !== undefined)  { updates.push(`teacher_id = $${i++}`); values.push(teacherId ?? null); }
      if (!updates.length) throw new GraphQLError('Nothing to update', { extensions: { code: 'BAD_REQUEST' } });
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE academic_classes SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
        values,
      );
      if (!rows[0]) throw new GraphQLError('Academic class not found', { extensions: { code: 'NOT_FOUND' } });
      const rc = (await pool.query(`SELECT name, grade FROM register_classes WHERE id = $1`, [rows[0].register_class_id])).rows[0];
      const tRow = rows[0].teacher_id
        ? (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [rows[0].teacher_id])).rows[0]
        : null;
      const { rows: eRows } = await pool.query(
        `SELECT COUNT(*) AS n FROM enrollments WHERE academic_class_id = $1`, [id],
      );
      return {
        id: rows[0].id, name: rows[0].name, subject: rows[0].subject,
        grade: rc?.grade ?? 0,
        totalSteps: rows[0].total_steps,
        registerClassId: rows[0].register_class_id,
        registerClassName: rc?.name ?? '',
        teacherId: rows[0].teacher_id ?? null,
        teacherName: tRow?.display_name ?? null,
        enrolledCount: Number(eRows[0].n),
      };
    },

    async adminDeleteAcademicClass(_: unknown, { id }: { id: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      await pool.query(`DELETE FROM academic_classes WHERE id = $1`, [id]);
      return true;
    },

    async adminEnrollLearner(
      _: unknown,
      { learnerId, academicClassId }: { learnerId: string; academicClassId: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      const { rows: acRows } = await pool.query(
        `SELECT register_class_id FROM academic_classes WHERE id = $1`, [academicClassId],
      );
      if (!acRows[0]) throw new GraphQLError('Academic class not found', { extensions: { code: 'NOT_FOUND' } });
      const registerClassId = acRows[0].register_class_id;
      await pool.query(
        `INSERT INTO enrollments (learner_id, register_class_id, academic_class_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [learnerId, registerClassId, academicClassId],
      );
      await pool.query(
        `INSERT INTO learner_progress (learner_id, academic_class_id, current_step, is_locked)
         VALUES ($1, $2, 0, false) ON CONFLICT DO NOTHING`,
        [learnerId, academicClassId],
      );
      return true;
    },

    async adminUnenrollLearner(
      _: unknown,
      { learnerId, academicClassId }: { learnerId: string; academicClassId: string },
      ctx: ApolloContext,
    ) {
      requireRole(ctx, 'Admin');
      await pool.query(
        `DELETE FROM enrollments WHERE learner_id = $1 AND academic_class_id = $2`,
        [learnerId, academicClassId],
      );
      await pool.query(
        `DELETE FROM learner_progress WHERE learner_id = $1 AND academic_class_id = $2`,
        [learnerId, academicClassId],
      );
      return true;
    },

    async adminDeleteTheme(_: unknown, { themeName }: { themeName: string }, ctx: ApolloContext) {
      requireRole(ctx, 'Admin');
      await pool.query(`DELETE FROM custom_themes WHERE name = $1`, [themeName]);
      return true;
    },
  },

  // ── Custom Theme queries ────────────────────────────────────────────────────
};

// ── Conversation helpers ─────────────────────────────────────────────────────

async function findIndividualConversation(userA: string, userB: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
     WHERE c.type = 'individual' LIMIT 1`,
    [userA, userB],
  );
  return rows[0]?.id ?? null;
}

async function findOrCreateIndividualConversation(userA: string, userB: string): Promise<string> {
  const existing = await findIndividualConversation(userA, userB);
  if (existing) return existing;
  const { rows } = await pool.query(`INSERT INTO conversations (type) VALUES ('individual') RETURNING id`);
  const convId = rows[0].id;
  await pool.query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
    [convId, userA, userB],
  );
  return convId;
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    pointsBalance: row.points_balance,
    paidStatus: row.paid_status,
  };
}

function mapProgress(row: Record<string, unknown>) {
  return {
    id: row.id,
    learnerId: row.learner_id,
    academicClassId: row.academic_class_id,
    currentStep: row.current_step,
    isLocked: row.is_locked,
  };
}

function mapDirectMessage(row: Record<string, unknown>, requestingUserId: string) {
  return {
    id: String(row.id),
    senderId: row.sender_id,
    senderName: row.sender_name,
    body: row.content,
    sentAt: new Date(row.sent_at as string).toISOString(),
    fromMe: row.sender_id === requestingUserId,
  };
}

function mapShopItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    subtype: row.subtype ?? null,
    themeCompatibility: row.theme_compatibility,
    cost: row.cost,
    description: row.description,
    tag: row.tag,
    scope: row.scope,
    assetPath: row.asset_path,
    owned: Boolean(row.owned),
    active: Boolean(row.active),
  };
}

function mapLearningTask(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    templateType: row.template_type,
    totalTimeMin: row.total_time_min,
    published: Boolean(row.published),
    folderPath: row.folder_path ?? '',
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    quizQuestionCount: Number(row.quiz_question_count ?? 0),
    blockCount: Number(row.block_count ?? 0),
    stepLabels: row.step_labels ?? ['CHALLENGE', 'REFLECTION', 'CONTENT', 'QUIZ', 'DISCUSSION', 'ASSIGNMENT'],
  };
}

// ── Input type interfaces (for resolver parameter typing) ────────────────────

interface QuizOptionInput  { letter: string; text: string; isCorrect: boolean }
interface QuizQuestionInput { number: number; text: string; options: QuizOptionInput[]; correctIndex: number }

interface HqlBlockInput {
  id: string; stepNumber: number; blockType: string; position: number
  title?: string | null; timeMin?: number | null
  textContent?: string | null; filePath?: string | null; originalName?: string | null
  data?: string | null  // JSON string
}

interface HqlTaskInput {
  id?: string | null
  title: string; subject: string; grade: string
  stepLabels: string[]
  blocks: HqlBlockInput[]
}

interface GeneralBlockInput {
  type: string; position: number; title: string; timeMin: number
  data: string; filePath?: string | null; originalName?: string | null
}

interface GeneralTaskInput {
  id?: string | null
  title: string; subject: string; grade: string; totalTimeMin: number
  blocks: GeneralBlockInput[]
  quizQuestions?: QuizQuestionInput[] | null
}
