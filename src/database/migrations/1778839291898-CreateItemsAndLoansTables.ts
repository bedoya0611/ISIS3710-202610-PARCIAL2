import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItemsAndLoansTables1778839291898 implements MigrationInterface {
  name = 'CreateItemsAndLoansTables1778839291898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."items_type_enum" AS ENUM('book', 'magazine', 'equipment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loans_status_enum" AS ENUM('active', 'returned', 'overdue', 'lost')`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(32) NOT NULL, "title" character varying(255) NOT NULL, "type" "public"."items_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_items_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_items_code" ON "items" ("code")');
    await queryRunner.query(
      `CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "item_id" uuid NOT NULL, "loaned_at" TIMESTAMP WITH TIME ZONE NOT NULL, "due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "returned_at" TIMESTAMP WITH TIME ZONE, "status" "public"."loans_status_enum" NOT NULL DEFAULT 'active', "fine_amount" numeric(10,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_loans_due_after_loaned" CHECK ("due_at" > "loaned_at"), CONSTRAINT "PK_loans_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_loans_item_status" ON "loans" ("item_id", "status")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_loans_user_status" ON "loans" ("user_id", "status")',
    );
    await queryRunner.query(
      'ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_item_id" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_item_id"');
    await queryRunner.query('ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_loans_user_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_loans_item_status"');
    await queryRunner.query('DROP TABLE "loans"');
    await queryRunner.query('DROP INDEX "public"."IDX_items_code"');
    await queryRunner.query('DROP TABLE "items"');
    await queryRunner.query('DROP TYPE "public"."loans_status_enum"');
    await queryRunner.query('DROP TYPE "public"."items_type_enum"');
  }
}
