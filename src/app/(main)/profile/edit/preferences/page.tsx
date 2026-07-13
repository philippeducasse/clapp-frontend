"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { selectProfile, updateProfile } from "@/redux/slices/authSlice";
import { AppDispatch, RootState } from "@/redux/store";
import {
  createZodFormSchema,
  sanitizeFormData,
  getInitialValues,
  prepareFormDataForSubmission,
} from "@/helpers/formHelper";
import FormHeader from "@/components/common/form/FormHeader";
import BasicForm from "@/components/common/form/BasicForm";
import { getPreferencesFormFields } from "@/components/page-components/profile/helpers/form/getPreferencesFormFields";
import { profileApiService } from "@/api/profileApiService";
import { Action, EntityName } from "@/interfaces/Enums";
import { Skeleton } from "@/components/ui/skeleton";

const EditPreferencesPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const profile = useSelector((state: RootState) => selectProfile(state));
  const [isLoading, setIsLoading] = useState(false);

  const formFields = useMemo(() => getPreferencesFormFields(), []);
  const formSchema = useMemo(() => createZodFormSchema(formFields), [formFields]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(formFields, profile ?? undefined),
    mode: "onSubmit",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profile) {
        try {
          const fetchedProfile = await profileApiService.get();
          dispatch(updateProfile(fetchedProfile));
          form.reset(sanitizeFormData(fetchedProfile));
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    };
    fetchProfile();
  }, [profile, dispatch, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const submissionData = prepareFormDataForSubmission(values, formFields);
      const updatedProfile = await profileApiService.update(submissionData);
      dispatch(updateProfile(updatedProfile));
      form.reset(sanitizeFormData(updatedProfile));
    } catch (error) {
      console.error("Error updating preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div>
        <FormHeader action={Action.EDIT} entityName={EntityName.PREFERENCES} />
        <div className="flex flex-col max-w-xl mx-auto">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <FormHeader action={Action.EDIT} entityName={EntityName.PREFERENCES} />

      <BasicForm
        form={form}
        formFields={formFields}
        onSubmit={onSubmit}
        isLoading={isLoading}
        action={Action.EDIT}
        submitButtonLabel="Save Preferences"
        onCancelHref="/profile#preferences"
      />
    </>
  );
};

export default EditPreferencesPage;
