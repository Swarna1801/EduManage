import React from "react";
import NotificationCenter from "../../components/notifications/NotificationCenter";

export default function ParentNotifications() {
  return (
    <NotificationCenter
      apiBasePath="/parent"
      subtitle="Messages from school and principal"
      emptyTitle="No notifications yet"
      emptySubtitle="Announcements from the principal and fee reminders will appear here."
    />
  );
}
