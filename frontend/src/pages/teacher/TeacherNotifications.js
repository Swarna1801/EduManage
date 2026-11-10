import React from "react";
import NotificationCenter from "../../components/notifications/NotificationCenter";

export default function TeacherNotifications() {
  return (
    <NotificationCenter
      apiBasePath="/teacher"
      subtitle="Messages from principal and school system"
      emptyTitle="No notifications yet"
      emptySubtitle="Announcements from the principal will appear here."
    />
  );
}
