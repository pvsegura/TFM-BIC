CREATE TABLE "teacher_students" (
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"linked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "teacher_students_pk" PRIMARY KEY("teacher_id","student_id"),
	CONSTRAINT "teacher_students_distinct_users" CHECK ("teacher_students"."teacher_id" <> "teacher_students"."student_id")
);
--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_students_student_id_idx" ON "teacher_students" USING btree ("student_id");