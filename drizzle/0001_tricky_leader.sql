ALTER TABLE `recipe_versions` ADD `servings` integer;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `prep_time` text;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `cook_time` text;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `total_time` text;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `rest_time` text;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `oven_temp_c` real;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `difficulty` text;--> statement-breakpoint
ALTER TABLE `recipe_versions` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `source_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferred_unit_system` text DEFAULT 'original' NOT NULL;