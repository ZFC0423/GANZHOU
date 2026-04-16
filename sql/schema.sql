-- --------------------------------------------------------
-- Ganzhou Travel Platform database init script
-- Database: ganzhou_travel_platform
-- Charset: utf8mb4
-- --------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `ganzhou_travel_platform`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `ganzhou_travel_platform`;

DROP TABLE IF EXISTS `ai_copywriting_logs`;
DROP TABLE IF EXISTS `ai_trip_logs`;
DROP TABLE IF EXISTS `ai_chat_logs`;
DROP TABLE IF EXISTS `chapter_configs`;
DROP TABLE IF EXISTS `home_recommends`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `scenic_spots`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `system_configs`;
DROP TABLE IF EXISTS `admins`;

CREATE TABLE `admins` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'super_admin',
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_username` (`username`),
  KEY `idx_admins_status` (`status`),
  KEY `idx_admins_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_code` (`code`),
  KEY `idx_categories_type` (`type`),
  KEY `idx_categories_status` (`status`),
  KEY `idx_categories_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `scenic_spots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `region` VARCHAR(100) NOT NULL,
  `category_id` BIGINT DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `gallery_images` TEXT,
  `intro` TEXT,
  `culture_desc` TEXT,
  `hero_caption` VARCHAR(255) DEFAULT NULL,
  `route_label` VARCHAR(100) DEFAULT NULL,
  `mood_tone` VARCHAR(30) NOT NULL DEFAULT 'amber',
  `quote` VARCHAR(255) DEFAULT NULL,
  `best_visit_season` VARCHAR(100) DEFAULT NULL,
  `visit_mode` VARCHAR(100) DEFAULT NULL,
  `pairing_suggestion` VARCHAR(255) DEFAULT NULL,
  `best_light_time` VARCHAR(100) DEFAULT NULL,
  `walking_intensity` VARCHAR(50) DEFAULT NULL,
  `photo_point` VARCHAR(255) DEFAULT NULL,
  `family_friendly` TINYINT NOT NULL DEFAULT 1,
  `open_time` VARCHAR(100) DEFAULT NULL,
  `ticket_info` VARCHAR(100) DEFAULT NULL,
  `suggested_duration` VARCHAR(50) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `traffic_guide` TEXT,
  `tips` TEXT,
  `tags` VARCHAR(255) DEFAULT NULL,
  `recommend_flag` TINYINT NOT NULL DEFAULT 0,
  `hot_score` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scenic_category_id` (`category_id`),
  KEY `idx_scenic_region` (`region`),
  KEY `idx_scenic_status` (`status`),
  KEY `idx_scenic_recommend_flag` (`recommend_flag`),
  KEY `idx_scenic_hot_score` (`hot_score`),
  KEY `idx_scenic_created_at` (`created_at`),
  CONSTRAINT `fk_scenic_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `articles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `category_id` BIGINT DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `summary` TEXT,
  `quote` VARCHAR(255) DEFAULT NULL,
  `content` LONGTEXT,
  `source` VARCHAR(255) DEFAULT NULL,
  `author` VARCHAR(100) DEFAULT NULL,
  `tags` VARCHAR(255) DEFAULT NULL,
  `recommend_flag` TINYINT NOT NULL DEFAULT 0,
  `view_count` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_articles_category_id` (`category_id`),
  KEY `idx_articles_status` (`status`),
  KEY `idx_articles_recommend_flag` (`recommend_flag`),
  KEY `idx_articles_created_at` (`created_at`),
  CONSTRAINT `fk_articles_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `banners` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `link_type` VARCHAR(50) DEFAULT NULL,
  `link_target` VARCHAR(255) DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_status` (`status`),
  KEY `idx_banners_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `home_recommends` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `module_name` VARCHAR(50) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` BIGINT NOT NULL,
  `visual_role` VARCHAR(30) NOT NULL DEFAULT 'support',
  `summary_override` VARCHAR(255) DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_home_recommends_module_name` (`module_name`),
  KEY `idx_home_recommends_target_type` (`target_type`),
  KEY `idx_home_recommends_target_id` (`target_id`),
  KEY `idx_home_recommends_status` (`status`),
  KEY `idx_home_recommends_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chapter_configs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `chapter_code` VARCHAR(50) NOT NULL,
  `chapter_title` VARCHAR(100) NOT NULL,
  `chapter_subtitle` VARCHAR(255) DEFAULT NULL,
  `chapter_intro` TEXT,
  `hero_image` VARCHAR(255) DEFAULT NULL,
  `hero_caption` VARCHAR(255) DEFAULT NULL,
  `route_label` VARCHAR(100) DEFAULT NULL,
  `mood_tone` VARCHAR(30) NOT NULL DEFAULT 'amber',
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chapter_configs_code` (`chapter_code`),
  KEY `idx_chapter_configs_sort` (`sort`),
  KEY `idx_chapter_configs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `question` TEXT NOT NULL,
  `answer` LONGTEXT,
  `matched_context` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `ip` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_trip_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `days` INT NOT NULL,
  `preferences` VARCHAR(255) DEFAULT NULL,
  `departure_area` VARCHAR(100) DEFAULT NULL,
  `pace` VARCHAR(50) DEFAULT NULL,
  `extra_requirement` TEXT,
  `result_content` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_trip_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_copywriting_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` BIGINT DEFAULT NULL,
  `input_data` LONGTEXT,
  `output_content` LONGTEXT,
  `prompt_text` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_copywriting_logs_target_type` (`target_type`),
  KEY `idx_ai_copywriting_logs_target_id` (`target_id`),
  KEY `idx_ai_copywriting_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_configs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` LONGTEXT,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_system_configs_key` (`config_key`),
  KEY `idx_system_configs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`id`, `username`, `password`, `nickname`, `avatar`, `role`, `status`) VALUES
(1, 'admin', 'pbkdf2$100000$cd2919c1a89fedf6ef46a4274a0178c5$86f053d04f766d120e3334878232a530e8fbd47a4261f54d072883c5e5c5a7e6', 'System Admin', '/uploads/default-avatar.png', 'super_admin', 1);

INSERT INTO `categories` (`id`, `name`, `code`, `type`, `sort`, `status`) VALUES
(1, 'Nature Scenic', 'scenic_nature', 'scenic', 1, 1),
(2, 'History Scenic', 'scenic_history', 'scenic', 2, 1),
(3, 'Ganzhou Food', 'food', 'article', 1, 1),
(4, 'Intangible Heritage', 'heritage', 'article', 2, 1),
(5, 'Red Culture', 'red_culture', 'article', 3, 1);

INSERT INTO `scenic_spots` (
  `id`, `name`, `region`, `category_id`, `cover_image`, `gallery_images`, `intro`, `culture_desc`,
  `open_time`, `ticket_info`, `suggested_duration`, `address`, `traffic_guide`, `tips`, `tags`,
  `recommend_flag`, `hot_score`, `status`
) VALUES
(1, '通天岩', 'Zhanggong', 2, '/uploads/scenic/tongtianyan-cover.jpg', '["/uploads/scenic/tongtianyan-1.jpg","/uploads/scenic/tongtianyan-2.jpg"]', '赣州重要的人文景点之一，也是进入石窟遗存与历史景观线索的一处代表性入口。它的价值不只在山石景观，更在长期积累下来的造像、题刻与文化遗存。', '通天岩位于赣州城西北郊，自唐代以来逐步形成石窟寺景观，是我国南方重要的石窟遗存之一，也常被称为“江南第一石窟”。对平台来说，它最适合承接“历史遗存—城市文脉—人文景观”这条理解路径，而不只是被当作单纯的游览点。', '08:30-17:30', 'Reference 50 CNY', '2-3 hours', 'Zhanggong District, Ganzhou', 'Taxi or self-drive from downtown is recommended.', '建议把通天岩与江南宋城、郁孤台、古城墙等内容结合浏览，这样更容易建立从具体遗存进入赣州老城文脉的整体理解。', 'grotto,history,weekend', 1, 98, 1),
(2, '郁孤台', 'Zhanggong', 2, '/uploads/scenic/yugutai-cover.jpg', '["/uploads/scenic/yugutai-1.jpg","/uploads/scenic/yugutai-2.jpg"]', '郁孤台是赣州老城历史文化阅读中最具代表性的地点之一。它既属于江南宋城的重要节点，也因长期进入文学记忆而具有很强的城市象征意义。', '郁孤台位于赣州老城历史文化核心区域，是江南宋城历史文化旅游区的重要组成部分，也因辛弃疾名句而广为人知。它更适合被理解为一个把城市历史、文学记忆与空间体验叠加在一起的文化节点，而不是单纯的观景高台。', 'All day', 'Free', '1-2 hours', 'Yugutai historic block, Ganzhou', 'You can visit it together with the old floating bridge.', '如果你对赣州老城感兴趣，建议把郁孤台与古浮桥、古城墙、福寿沟等内容一起浏览，这样更容易理解“江南宋城”这条总线索。', 'old-city,history,citywalk', 1, 95, 1),
(3, '古浮桥', 'Zhanggong', 2, '/uploads/scenic/gufuqiao-cover.jpg', '["/uploads/scenic/gufuqiao-1.jpg","/uploads/scenic/gufuqiao-2.jpg"]', '古浮桥是赣州老城空间记忆中非常有辨识度的一处地点。它把城市水系、古城生活与现实步行体验联系在一起，是理解宋城日常感的重要入口。', '古浮桥是江南宋城核心资源之一，也常被与古城墙、古街道、福寿沟一起理解为赣州古代城市建设的重要线索。它的意义不只在“古”，更在于它让人看到这座城市如何把历史、水系与生活方式组织在一起。', 'All day', 'Free', '1 hour', 'Along Zhang River, Ganzhou', 'Best visited on foot from nearby old city spots.', '建议把古浮桥放在“老城步行线”里理解：先看城市节点，再看人与水系、街区和桥之间的关系，会比单独打卡更容易建立完整印象。', 'bridge,landmark,photo', 1, 90, 1),
(4, '三百山', 'Anyuan', 1, '/uploads/scenic/sanbaishan-cover.jpg', '["/uploads/scenic/sanbaishan-1.jpg","/uploads/scenic/sanbaishan-2.jpg"]', '三百山适合作为赣州生态山水线的重要入口。它的阅读重点在于东江源头、山岳生态与自然体验共同形成的整体观感，而不是历史文化叙事本身。', '三百山位于安远，是东江源头所在地，也是赣州重要的生态旅游资源。当前页面建议以基础导览与体验方向说明为主，不强行把它并入老城历史或红色文化线索。', '08:00-17:00', 'Reference 90 CNY', 'Half day to 1 day', 'Anyuan County, Ganzhou', 'Self-drive is recommended for this route.', '若你更关注文化和历史线索，建议继续转向江南宋城、客家文化或红色文化相关内容；若偏好自然体验，可将三百山作为山水探索路径的一站。', 'nature,forest,eco-tour', 1, 93, 1),
(5, '客家文化城', 'Ganxian', 2, '/uploads/scenic/hakka-city-cover.jpg', '["/uploads/scenic/hakka-city-1.jpg","/uploads/scenic/hakka-city-2.jpg"]', '客家文化城更适合被理解为“进入客家文化的一座综合入口”，而不只是单一景点。这里把宗祠、围屋、文化街与陈展空间组织在一起，适合作为第一次接触赣州客家文化时的阅读起点。', '客家文化城位于赣县区，是集祭祀庆典、文博展览、商贸活动和休闲体验于一体的综合性客家文化景区，也曾作为重要客属活动与客家文化节的主会场。它更适合作为“综合文化入口”来理解，而不是孤立地当作一处建筑群来介绍。', '09:00-17:00', 'Reference 60 CNY', '2-3 hours', 'Ganxian District, Ganzhou', 'Can be visited together with nearby cultural spots.', '建议把客家文化城与客家围屋、客家擂茶、非遗专题和客家生活方式内容一起浏览，这样更容易从综合入口进入更具体的客家文化结构。', 'hakka,culture,family', 0, 85, 1),
(6, '丫山景区', 'Dayu', 1, '/uploads/scenic/yashan-cover.jpg', '["/uploads/scenic/yashan-1.jpg","/uploads/scenic/yashan-2.jpg"]', '丫山更适合作为赣州生态休闲、森林康养和乡村度假方向的代表性入口。它的阅读重点在于山地生态、康养体验与休闲空间，而不是厚重历史叙事。', '丫山位于大余县，因山体形状而得名，当前更适合作为生态体验型景点来理解。页面建议以基础导览、休闲方向与体验说明为主，不强行堆砌文化厚度。', '08:30-17:30', 'Reference 80 CNY', 'Half day to 1 day', 'Dayu County, Ganzhou', 'Check weather before departure.', '如果你更看重文化和历史内容，建议继续浏览江南宋城、客家文化或红色文化相关页面；如果偏好山水与康养体验，丫山适合作为另一条探索路径的起点。', 'vacation,nature,wellness', 0, 82, 1),
(7, '福寿沟', 'Zhanggong', 2, NULL, '[]', '福寿沟是赣州古城最具代表性的城市工程遗存之一。它的价值不在表面观感，而在于它让人直观看到一座古城如何在很早以前就解决排水、防洪与日常运行的问题。', '福寿沟是赣州古城地下的大规模古代砖石排水管沟系统，利用地势高差、城内水系和水窗形成排水防洪体系，至今仍是旧城区排水系统的重要组成部分。它之所以值得被反复提起，不只因为“古”，更因为它是一处至今仍在发挥作用的“活文物”。', NULL, NULL, NULL, NULL, NULL, '建议把福寿沟与江南宋城、古城墙、郁孤台、古浮桥一起浏览。这样更容易理解赣州老城不是静止的历史外壳，而是一套仍能被看见、被解释的城市系统。', 'engineering,old-city,drainage', 1, 0, 1);

INSERT INTO `articles` (
  `id`, `title`, `category_id`, `cover_image`, `summary`, `content`, `source`, `author`, `tags`,
  `recommend_flag`, `view_count`, `status`
) VALUES
(1, '赣南小炒鱼：从一盘地方风味进入赣州的日常口味', 3, '/uploads/article/xiaochaoyu-cover.jpg', '赣南小炒鱼适合作为进入赣州地方风味的一道入口。它之所以值得写，不只是因为知名度高，更因为它能把用户直接带入赣州的日常口味经验与城市生活感。', '如果要从一道菜开始理解赣州，美食不一定要先讲得多宏大，先讲“为什么它能留在当地人的餐桌上”往往更有效。赣南小炒鱼之所以适合放在首页与美食专题，不在于它有多复杂，而在于它足够日常、足够地方，也足够能代表赣州人熟悉的味道方向。对平台来说，这类内容最适合作为“城市风味与老城体验”主题下的入口：它能把用户从“看景点”带向“理解城市生活”。', 'platform', 'system', 'food,hakka,local-dish', 1, 128, 1),
(2, '宁都肉丸：从地方味道看见客家饮食的家常与讲究', 3, '/uploads/article/ningdou-rouwan-cover.jpg', '宁都肉丸适合被写成“地方味道如何承载人情与日常”的内容入口。它不仅是风味条目，更适合作为理解宁都与客家饮食经验的一道门。', '平台在写这类内容时，不需要把它写成菜谱，也不应该只写成“地方名菜”。更合适的方式，是让用户看到：一道地方食物为什么会在一个地方持续出现、持续被记住。宁都肉丸适合承接的是“地方味道—家庭记忆—客家饮食经验”这条线，它能和客家文化、地方宴席、日常生活方式继续连起来。', 'platform', 'system', 'food,ningdu,snack', 1, 96, 1),
(3, '赣南采茶戏：从舞台进入赣州的地方表达', 4, '/uploads/article/gan-nan-tea-opera-cover.jpg', '赣南采茶戏是赣州地方文化中极具代表性的表达方式之一，也是国家级非物质文化遗产。它适合作为从非遗进入地方文化结构的一条主线。', '如果想理解赣州的非遗内容，赣南采茶戏是很难绕开的入口。它的意义不只是“有名”，而在于它把地方语言、表演节奏、民间生活感和舞台传统放在了一起。对平台来说，这类内容最适合承担“从非遗进入地方文化结构”的任务：先让用户知道它是什么，再让用户意识到它不是专题页里的一个名词，而是一种仍在被演出、被传承、被重新理解的地方文化表达。', 'platform', 'system', 'heritage,opera,folk-art', 1, 150, 1),
(4, '客家擂茶：从一碗擂茶进入客家生活方式', 4, '/uploads/article/lei-cha-cover.jpg', '客家擂茶适合被写成“饮食与生活方式的结合体”，而不是单纯的小吃名称。它能帮助用户从食物进入客家人的日常经验。', '平台在处理客家擂茶时，不能只写口味，也不能只写材料。更重要的是把它放回客家人的日常场景里：它为什么会被做、在什么关系里被分享、为什么会成为客家文化中一眼就能让人记住的内容。这样写，擂茶才不是一碗饮品，而会变成“从食物进入文化”的入口。', 'platform', 'system', 'heritage,hakka,tea', 0, 88, 1),
(5, '瑞金红色遗址：从真实地点进入红色记忆', 5, '/uploads/article/ruijin-red-cover.jpg', '写瑞金红色遗址，关键不在口号，而在地点。因为红色文化要真正被理解，最好的入口往往不是概念，而是那些仍然留存在当地的真实遗址与真实记忆。', '这类内容不适合写成情绪化赞颂，也不适合写成空泛背景。更好的方式，是让用户先意识到：为什么要从瑞金这样的地方进入红色记忆。因为当历史不只停留在概念层，而是落实到遗址、纪念、讲述和公共记忆中，它才真正能够被看见、被走近、被理解。对平台来说，瑞金红色遗址应承担的是“地点如何承载历史”的解释任务。', 'platform', 'system', 'red-culture,history,study-tour', 1, 166, 1),
(6, '赣南长征精神：从出发地理解这段历史的重量', 5, '/uploads/article/long-march-cover.jpg', '“长征精神”如果只停留在抽象表达，很容易被说空。放在赣南语境里，更好的写法是从“为什么这里会成为出发地”开始。', '在平台里写“赣南长征精神”，不能写成口号化条目，而应该把它写成一条理解路径：先让用户知道赣南与中央苏区、长征出发地之间的关系，再去理解“精神”为什么会从这里被持续提起。这样，用户看到的不再是一句抽象概括，而是一个由地点、人物、牺牲、记忆和后续传承共同构成的历史线索。', 'platform', 'system', 'red-culture,long-march,ganzhou', 0, 103, 1),
(7, '江南宋城：从一座老城进入赣州最具代表性的历史线索', 4, NULL, '江南宋城不是单一景点名称，而是理解赣州老城最重要的一条总线索。它把古城墙、郁孤台、八境台、福寿沟、古浮桥等历史遗存与街区空间组织在一起，是赣州最具代表性的城市文化名片之一。', '如果要回答“为什么赣州和别的城市不同”，最直接的入口之一就是江南宋城。它的重要性不在某一个点有多著名，而在于整座老城至今仍保存着较清晰的宋代文化遗存与城市结构线索。对平台来说，这类内容应承担总纲作用：先让用户理解“宋城”是什么，再把人带到具体地点、具体街区和具体体验中去。', 'platform', 'system', 'old-city,history,city-culture', 1, 0, 1),
(8, '客家围屋：从聚居空间进入赣州客家文化的内部结构', 4, NULL, '客家围屋是客家文化最直观的物质载体之一，也是赣州“客家摇篮”身份最容易被看见的空间证据。理解围屋，不只是看建筑形态，更是在理解迁徙、聚居、家族与地方生活方式。', '平台如果只把客家围屋写成建筑介绍，会浪费掉它真正的重要性。更合适的写法，是让用户看到：为什么客家文化一旦落到赣南，最容易被记住的就是围屋。因为它既是生活空间，也是防御、家族、迁徙记忆和地方身份的综合体现。对平台来说，客家围屋非常适合承担“从一个看得见的空间，进入客家文化整体结构”的任务。', 'platform', 'system', 'hakka,architecture,settlement', 1, 0, 1);

INSERT INTO `banners` (`id`, `title`, `image_url`, `link_type`, `link_target`, `sort`, `status`) VALUES
(1, 'Explore Ganzhou Culture', '/uploads/banner/banner-1.jpg', 'scenic', '/scenic/1', 1, 1),
(2, 'Taste Food and Heritage', '/uploads/banner/banner-2.jpg', 'article', '/food/1', 2, 1);

INSERT INTO `home_recommends` (`id`, `module_name`, `target_type`, `target_id`, `sort`, `status`) VALUES
(1, 'scenic', 'scenic', 1, 1, 1),
(2, 'scenic', 'scenic', 2, 2, 1),
(3, 'food', 'article', 1, 1, 1),
(4, 'food', 'article', 2, 2, 1),
(5, 'heritage', 'article', 3, 1, 1),
(6, 'heritage', 'article', 4, 2, 1),
(7, 'red_culture', 'article', 5, 1, 1),
(8, 'red_culture', 'article', 6, 2, 1),
(9, 'scenic', 'scenic', 7, 3, 1),
(10, 'heritage', 'article', 7, 0, 1);

INSERT INTO `chapter_configs` (
  `id`, `chapter_code`, `chapter_title`, `chapter_subtitle`, `chapter_intro`,
  `hero_image`, `hero_caption`, `route_label`, `mood_tone`, `sort`, `status`
) VALUES
(1, 'food', '城脉与老城生活', '从味觉、街巷和夜色进入赣州。', '先闻见这座城，再理解这座城的节奏与日常。', '/immersive/topic-headers/P0-03_FoodTopic_official_04.png', '从夜色、街巷和锅气进入赣州，先闻见这座城，再理解这座城。', '夜色、街巷与锅气', 'amber', 1, 1),
(2, 'heritage', '客乡与手艺', '从器物、聚落和代际传承进入赣州。', '看见地方文化如何在日常里延续，而不只是作为展品存在。', '/immersive/topic-headers/P0-04_HakkaCulture_culture_03.jpg', '器物、动作与人群关系一起构成地方文化，而不是孤立展品。', '手艺、聚落与生活方式', 'earth', 2, 1),
(3, 'red_culture', '红土与记忆', '从旧址、纪念空间与历史路径进入赣州。', '让地点先开口，再理解记忆的重量。', '/immersive/topic-headers/P0-05_RedCulture_official_04.png', '纪念空间、旧址与公共记忆共同构成叙事，而不是口号。', '旧址、纪念与历史重量', 'crimson', 3, 1);

INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `remark`) VALUES
(1, 'site_name', 'Ganzhou Travel Platform', 'site name'),
(2, 'site_description', 'Ganzhou travel and culture smart service platform', 'site description'),
(3, 'ai_model_name', 'gpt-4o-mini', 'ai model placeholder'),
(4, 'home_hero_image', '/immersive/hero/P0-01_AncientWall_official_03.jpg', 'home hero image'),
(5, 'home_hero_note', '先形成城市气质，再进入章节、地点与 AI 导览。', 'home hero note');

SET FOREIGN_KEY_CHECKS = 1;
