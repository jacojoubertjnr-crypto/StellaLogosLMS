-- Staffroom seed data — wipes and re-inserts on each run
-- IDs: Admin = 608ee301-331f-4f35-9f24-d0df36d3efc7
--       Ms. Joubert = ad95448a-8f4b-46f6-9b9f-1b2150facb3e

-- ── Reset ─────────────────────────────────────────────────────────────────────

TRUNCATE staff_messages, announcements RESTART IDENTITY CASCADE;
UPDATE staffroom_state SET current_speaker_id = NULL WHERE id = 1;

-- ── Staffroom state — Admin holds the podium ──────────────────────────────────

UPDATE staffroom_state SET current_speaker_id = '608ee301-331f-4f35-9f24-d0df36d3efc7' WHERE id = 1;

-- ── Speaker channel posts (is_speaker_post = true) ────────────────────────────

INSERT INTO staff_messages (sender_id, body, is_speaker_post, sent_at) VALUES
  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Good morning staff. A few items before the day starts.',
   true, now() - interval '42 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Please ensure all Phase II content uploads are completed by end of school today. The server maintenance window begins at 18:00 and the portal will be unavailable until tomorrow morning.',
   true, now() - interval '41 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Grade 12 trial exam timetables have been finalised. Printed copies are in the admin office — please collect yours before Period 3.',
   true, now() - interval '40 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'The IT lab will be unavailable during Period 4 today for network upgrades. Please make alternative arrangements if you had a practical lesson scheduled.',
   true, now() - interval '39 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'That is all from me. Have a productive day. Ms. Joubert, the podium is yours if you need it.',
   true, now() - interval '38 minutes');

-- ── Staff chat (mix of speaker and regular posts) ─────────────────────────────

INSERT INTO staff_messages (sender_id, body, is_speaker_post, sent_at) VALUES
  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Good morning everyone. Noted on the lab — I will move my Gr 10 practical to the library for independent reading instead.',
   false, now() - interval '37 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Thanks Ms. Joubert. I will notify the network team to prioritise your lab first so it may be back by Period 5.',
   false, now() - interval '35 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'That would be great, thank you. On another note — the Gr 12 IT group is asking about the PAT submission deadline. Can we confirm it is end of Term 3?',
   false, now() - interval '32 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Confirmed. PAT final submission is last Friday of Term 3. All three phases must be uploaded to the portal by then. I will post a formal announcement now.',
   false, now() - interval '30 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Perfect. I have been reminding them weekly but a formal announcement on the portal will carry more weight.',
   false, now() - interval '28 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Agreed. Also a reminder that the moderation visit from the district office is scheduled for next Thursday. Please have your mark sheets and lesson plans ready for review.',
   false, now() - interval '25 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Will do. My mark sheets are up to date. Should I bring printed copies or will digital on the portal be sufficient?',
   false, now() - interval '22 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Bring both — printed for the moderator and digital as backup. The district tends to prefer printed for the initial review.',
   false, now() - interval '20 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Understood. I will print everything by Wednesday. Is there anything specific they will be looking at for IT this cycle?',
   false, now() - interval '17 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'They will focus on PAT management, assessment moderation, and learning task alignment with CAPS. I will send a checklist to all staff by tomorrow.',
   false, now() - interval '14 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'That checklist would be very helpful, thank you. One more thing — the Gr 9 Robotics group completed their sensor challenge today. Some really impressive work. Worth a mention at the next staff meeting.',
   false, now() - interval '10 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Excellent! I will add it to the agenda. Feel free to share any photos or clips to the school WhatsApp group as well — parents love seeing that kind of work.',
   false, now() - interval '7 minutes'),

  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Will do. I will get consent from the learners first and send something through this afternoon.',
   false, now() - interval '4 minutes'),

  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Good thinking on the consent. Let me know if you need the standard media release form — it is in the shared drive under Admin > Templates.',
   false, now() - interval '2 minutes');

-- ── Announcements ─────────────────────────────────────────────────────────────

INSERT INTO announcements (created_by, body, target, pinned, created_at) VALUES

  -- Pinned, all learners
  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'IMPORTANT: The learner portal will be offline for maintenance from 18:00 today until 07:00 tomorrow morning. Please complete all outstanding submissions and uploads before 17:30. Any work submitted after the portal reopens will be timestamped accordingly.',
   'all', true, now() - interval '30 minutes'),

  -- Pinned, Gr 12 only
  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Grade 12 IT — PAT DEADLINE REMINDER: All three PAT phases (Analysis, Design, and Solution) must be submitted via the learner portal by the last Friday of Term 3. No extensions will be granted. Please check that all phases are uploaded and marked as submitted, not just saved as drafts.',
   '12', true, now() - interval '28 minutes'),

  -- Not pinned, all learners
  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'The district moderation team will be visiting the school next Thursday. Learners may be asked to show their work on the portal during this visit. Please ensure your submissions are complete and up to date.',
   'all', false, now() - interval '25 minutes'),

  -- Not pinned, Gr 10 and 11
  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'IT Grade 10 and 11: The computer lab will be unavailable during Period 4 today due to scheduled network maintenance. Your teacher will communicate alternative arrangements for any affected practicals.',
   '10,11', false, now() - interval '38 minutes'),

  -- Not pinned, Gr 9
  ('ad95448a-8f4b-46f6-9b9f-1b2150facb3e',
   'Grade 9 Robotics — well done on completing the sensor challenge today! Your projects showed excellent problem-solving and creativity. Results will be uploaded to the portal by end of this week.',
   '9', false, now() - interval '8 minutes'),

  -- Not pinned, all learners
  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Reminder: the school photo retake day is this Friday. Any learner who was absent on the original photo day or who was not satisfied with their photo should report to the hall during first break. Full school uniform is compulsory.',
   'all', false, now() - interval '3 days'),

  -- Not pinned, Gr 11 and 12
  ('608ee301-331f-4f35-9f24-d0df36d3efc7',
   'Grade 11 and 12 learners: the career guidance information evening for parents will be held on Wednesday at 18:30 in the school hall. Learners are welcome to attend with their parents. Topics include subject choices, university applications, and bursary opportunities.',
   '11,12', false, now() - interval '2 days');
