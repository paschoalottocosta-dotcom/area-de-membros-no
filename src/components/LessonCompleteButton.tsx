"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { toggleLessonComplete } from "@/app/products/actions";

function SubmitButton({ completed }: { completed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn--outline lesson-complete ${completed ? "lesson-complete--done" : ""}`}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      {completed ? "Concluída" : "Marcar como concluída"}
    </button>
  );
}

export function LessonCompleteButton({ lessonId, completed, path }: { lessonId: string; completed: boolean; path: string }) {
  return (
    <form action={toggleLessonComplete}>
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="completed" value={completed ? "false" : "true"} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton completed={completed} />
    </form>
  );
}
