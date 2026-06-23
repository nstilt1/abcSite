import { RequireAuth } from "@/components/RequireAuth";
import ProfileClient from "./ProfileClient";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileClient />
    </RequireAuth>
  );
}