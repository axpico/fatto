import { redirect } from "next/navigation";

export default function PantryPage() {
  redirect("/shopping-list?tab=dispensa");
}
