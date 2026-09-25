/**
 * The student is not one the teacher may see. Deliberately the same error — and the same `404`
 * — whether the id does not exist, belongs to a user who is not a student, or belongs to another
 * teacher's student: a teacher learns nothing about accounts outside their own roster.
 */
export class TeachingStudentNotFoundError extends Error {
  constructor() {
    super("Student not found.");
    this.name = "TeachingStudentNotFoundError";
  }
}
