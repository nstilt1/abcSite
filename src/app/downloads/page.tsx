import GalleryPage from "@/components/content/GalleryPage"
import { getAllDownloads } from "@/lib/content"

export default function DownloadsPage() {
  return (
    <GalleryPage 
      title="Downloads" 
      subtitle="Software and utilities for power users."
      collection="downloads"
      items={getAllDownloads()}
    />
  )
}
