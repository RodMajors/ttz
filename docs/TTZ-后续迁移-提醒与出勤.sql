-- TTZ 已执行初始 SQL 后的增量迁移草案
-- 本文件只执行一次，不要重复执行；正式开发时转换为 Prisma migration。
USE `ttz`;

-- 出勤 status 最终约定：
-- 0 待记录，1 正常出勤，2 迟到，3 请假，4 缺席，5 替补，6 未报名。
-- 正常出勤和迟到属于有效出勤；不记录早退。
ALTER TABLE `attendance_records`
    MODIFY COLUMN `status` TINYINT NOT NULL DEFAULT 0
        COMMENT '0待记录 1正常出勤 2迟到 3请假 4缺席 5替补 6未报名',
    DROP CHECK `chk_attendance_status`,
    ADD CONSTRAINT `chk_attendance_status_v2`
        CHECK (`status` IN (0, 1, 2, 3, 4, 5, 6));

-- 用户可关闭的提醒：活动发布、报名结果、开组前提醒、活动取消。
CREATE TABLE `notification_preferences`
(
    `user_id`             BIGINT UNSIGNED NOT NULL,
    `activity_published`  TINYINT NOT NULL DEFAULT 1,
    `signup_result`       TINYINT NOT NULL DEFAULT 1,
    `before_team_up`      TINYINT NOT NULL DEFAULT 1,
    `activity_cancelled`  TINYINT NOT NULL DEFAULT 1,
    `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_notification_preference_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `chk_notification_preference_flags`
        CHECK (`activity_published` IN (0, 1)
           AND `signup_result` IN (0, 1)
           AND `before_team_up` IN (0, 1)
           AND `activity_cancelled` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='用户小程序订阅消息偏好';

INSERT INTO `notification_preferences` (`user_id`)
SELECT `id` FROM `users`
ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`);
