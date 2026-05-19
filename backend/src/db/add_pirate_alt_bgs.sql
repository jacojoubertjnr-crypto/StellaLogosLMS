INSERT INTO shop_items (name, description, item_type, asset_path, cost, tag, scope, theme_compatibility, subtype)
VALUES
  ('Pirate Cove - Home',       'Alternate home background for the Pirates! theme.',          'Alternate Background', '/assets/themes/classicPirate/home/background_alt.png',        250, 'ALT BG . HOME',         'home',         'classicPirate', NULL),
  ('Pirate Cove - Study',      'Alternate learning task background for the Pirates! theme.', 'Alternate Background', '/assets/themes/classicPirate/learningTask/background_alt.png', 250, 'ALT BG . LEARNING TASK','learningTask',  'classicPirate', NULL),
  ('Pirate Cove - Attendance', 'Alternate attendance background for the Pirates! theme.',    'Alternate Background', '/assets/themes/classicPirate/attendence/background_alt.png',   250, 'ALT BG . ATTENDANCE',  'attendence',   'classicPirate', NULL),
  ('Pirate Cove - Subjects',   'Alternate subjects background for the Pirates! theme.',      'Alternate Background', '/assets/themes/classicPirate/mySubjects/background_alt.png',   250, 'ALT BG . SUBJECTS',    'mySubjects',   'classicPirate', NULL),
  ('Pirate Cove - Shop',       'Alternate shop background for the Pirates! theme.',          'Alternate Background', '/assets/themes/classicPirate/shop/background_alt.png',         250, 'ALT BG . SHOP',        'shop',         'classicPirate', NULL)
ON CONFLICT (name) DO NOTHING;
