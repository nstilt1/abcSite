import GalleryPage from "@/components/content/GalleryPage"
import { getAllBlogs } from "@/lib/content"

export default function BlogPage() {
  return (
    <GalleryPage 
      title="Blog" 
      subtitle="Insights, tutorials, and updates."
      collection="blogs"
      items={getAllBlogs()}
    />
  )
}
