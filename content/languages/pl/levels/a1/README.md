# Polish — A1

`content/` holds the published seed items, one JSON file per item, named by its id
(`pl-greetings.json`). Their order is the explicit `order` field, not the file name. See
[content-architecture.md](../../../../../docs/architecture/content-architecture.md).

`exercises/` holds a small set of practice exercises (multiple choice, text answer, true/false), each named by
its id and tied to one of the lessons above by `lessonId`. It is a representative set that shows the exercise
engine working, not a full A1 exercise bank. Every fact in an exercise is taken from its lesson.
