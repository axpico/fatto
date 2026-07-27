import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { PrintView } from "@/components/PrintView";

export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
      nutrition: true,
    },
  });

  if (!recipe) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const recipeUrl = host ? `${proto}://${host}/recipes/${recipe.id}` : `/recipes/${recipe.id}`;
  const qrDataUrl = await QRCode.toDataURL(recipeUrl, { margin: 1, width: 160 });

  return <PrintView recipe={recipe} qrDataUrl={qrDataUrl} />;
}
