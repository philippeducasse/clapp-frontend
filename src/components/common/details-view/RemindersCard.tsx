"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AlarmClock, Plus, Trash2 } from "lucide-react";
import { Reminder } from "@/interfaces/entities/Reminder";
import { OrganisationType } from "@/interfaces/Enums";
import { reminderApiService } from "@/api/reminderApiService";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/stringUtils";
import { ReminderModal } from "../modals/ReminderModal";

interface RemindersCardProps {
  organisationType: OrganisationType;
  entityId: number;
}

const RemindersCard = ({ organisationType, entityId }: RemindersCardProps) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openReminderModal, setOpenReminderModal] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const data = await reminderApiService.getRemindersForEntity(organisationType, entityId);
        setReminders(data);
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [organisationType, entityId]);

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
    <Card className="h-fit max-h-[250px] overflow-auto mb-6">
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
          organisationType={organisationType}
          entityId={entityId}
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
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {reminder.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(reminder.remindAt)}
                      {reminder.isSent && (
                        <span className="ml-2 text-gray-400 dark:text-gray-500">(sent)</span>
                      )}
                    </p>
                  </div>
                  {!reminder.isSent && (
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

export default RemindersCard;
