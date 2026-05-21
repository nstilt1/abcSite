import GalleryPage from "@/components/content/GalleryPage"
import { getAllWebapps } from "@/lib/content"

export default function WebAppsPage() {
  return (
    <GalleryPage 
      title="Web Applications" 
      subtitle="Our collection of high-performance web tools."
      collection="webapps"
      items={getAllWebapps()}
    />
  )
}
