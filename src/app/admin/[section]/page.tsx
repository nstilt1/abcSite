import { notFound } from "next/navigation";
import { ContentSectionEditor } from "@/components/admin/ContentSectionEditor";
import { fetchSectionItems } from "@/lib/admin-content/fetchers";
import { isAdminSectionKey, sectionConfig } from "@/lib/admin-content/config";

type Props = {
  params: Promise<{
    section: string;
  }>;
};

export default async function AdminSectionPage({ params }: Props) {
  const { section } = await params;

  if (!isAdminSectionKey(section)) {
    notFound();
  }

  const schema = sectionConfig[section];
  const items = await fetchSectionItems<typeof schema.createEmpty extends () => infer T ? T : never>(section);

  return (
    <ContentSectionEditor
      schema={schema as never}
      initialItems={items as never}
      saveEndpoint="https://yy35luzj4k.execute-api.us-east-1.amazonaws.com/default/update_content"
    />
  );
}