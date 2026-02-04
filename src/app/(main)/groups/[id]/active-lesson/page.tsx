import { redirect } from "next/navigation";

export default function ActiveLessonPage({ params }: { params: { id: string } }) {
  redirect(`/groups/${params.id}/teaching`);
}
