"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/redux/hook";
import { useSelector } from "react-redux";
import { fetchProfile, selectProfile } from "@/redux/slices/authSlice";

export default function ProfileHydrator() {
  const dispatch = useAppDispatch();
  const profile = useSelector(selectProfile);

  useEffect(() => {
    if (!profile) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile]);

  return null;
}
