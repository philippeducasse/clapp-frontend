"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AlarmClock, CheckCheck, Plus, Trash2 } from "lucide-react";
import { Reminder } from "@/interfaces/entities/Reminder";
import { reminderApiService } from "@/api/reminderApiService";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/stringUtils";
import { ReminderModal } from "@/components/common/modals/ReminderModal";
import { OrganisationType } from "@/interfaces/Enums";

const ProfileRemindersCard = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openReminderModal, setOpenReminderModal] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchReminders = async () => {
    try {
      const data = await reminderApiService.getReminders();
      setReminders(data);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchReminders();
      hasFetchedRef.current = true;
    }
  }, []);

  const handleDelete = async (reminderId: number) => {
    try {
      await reminderApiService.deleteReminder(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (error) {
      console.error("Failed to delete reminder:", error);
    }
  };

  const handleReminderCreated = (newReminder: Reminder) => {
    setReminders((prev) => [...prev, newReminder]);
  };

  return (
    <Card className="h-fit max-w-2xl mx-auto">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlarmClock className="text-primary" size={20} />
            <CardTitle className="text-lg font-semibold text-black dark:text-foreground">
              Reminders
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-primary"
            onClick={() => setOpenReminderModal(true)}
          >
            <Plus size={16} />
          </Button>
        </div>

        <ReminderModal
          open={openReminderModal}
          onOpenChange={setOpenReminderModal}
          reminderApiMethod={reminderApiService.setReminder}
          organisationType={OrganisationType.FESTIVAL}
          entityId={0}
          onReminderCreated={handleReminderCreated}
        />

        {isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : reminders?.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic">No reminders set</p>
        ) : (
          <div className="space-y-3">
            {reminders?.map((reminder) => (
              <div key={reminder.id} className="p-3 rounded-lg border">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-primary mb-1">
                      {reminder.organisationName || reminder.organisationType}
                    </p>
                    <p className="text-forground break-words">{reminder.message}</p>
                    <p className="mt-1">{formatDate(reminder.remindAt)}</p>
                  </div>
                  {reminder.isSent ? (
                    <div className="flex gap-2">
                      <p className="">Sent</p>
                      <CheckCheck size={25} className="text-primary" />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileRemindersCard;
