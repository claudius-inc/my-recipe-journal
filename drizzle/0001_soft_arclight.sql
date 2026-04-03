DROP INDEX "accounts_user_id_idx";--> statement-breakpoint
DROP INDEX "accounts_provider_idx";--> statement-breakpoint
DROP INDEX "groups_version_id_idx";--> statement-breakpoint
DROP INDEX "groups_version_order_idx";--> statement-breakpoint
DROP INDEX "ingredients_version_id_idx";--> statement-breakpoint
DROP INDEX "ingredients_group_id_idx";--> statement-breakpoint
DROP INDEX "passkey_user_id_idx";--> statement-breakpoint
DROP INDEX "passkey_credential_id_idx";--> statement-breakpoint
DROP INDEX "versions_recipe_id_idx";--> statement-breakpoint
DROP INDEX "recipes_user_id_idx";--> statement-breakpoint
DROP INDEX "recipes_pinned_at_idx";--> statement-breakpoint
DROP INDEX "recipes_category_idx";--> statement-breakpoint
DROP INDEX "sessions_token_unique";--> statement-breakpoint
DROP INDEX "sessions_user_id_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "verifications_identifier_value_idx";--> statement-breakpoint
DROP INDEX "photos_version_id_idx";--> statement-breakpoint
DROP INDEX "photos_version_order_idx";--> statement-breakpoint
ALTER TABLE `ingredients` ALTER COLUMN "quantity" TO "quantity" real;--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_idx` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `groups_version_id_idx` ON `ingredient_groups` (`version_id`);--> statement-breakpoint
CREATE INDEX `groups_version_order_idx` ON `ingredient_groups` (`version_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `ingredients_version_id_idx` ON `ingredients` (`version_id`);--> statement-breakpoint
CREATE INDEX `ingredients_group_id_idx` ON `ingredients` (`group_id`);--> statement-breakpoint
CREATE INDEX `passkey_user_id_idx` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE INDEX `passkey_credential_id_idx` ON `passkey` (`credential_id`);--> statement-breakpoint
CREATE INDEX `versions_recipe_id_idx` ON `recipe_versions` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `recipes_user_id_idx` ON `recipes` (`user_id`);--> statement-breakpoint
CREATE INDEX `recipes_pinned_at_idx` ON `recipes` (`pinned_at`);--> statement-breakpoint
CREATE INDEX `recipes_category_idx` ON `recipes` (`primary_category`,`secondary_category`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `verifications_identifier_value_idx` ON `verifications` (`identifier`,`value`);--> statement-breakpoint
CREATE INDEX `photos_version_id_idx` ON `version_photos` (`version_id`);--> statement-breakpoint
CREATE INDEX `photos_version_order_idx` ON `version_photos` (`version_id`,`order`);