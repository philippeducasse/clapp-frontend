import React from "react";
import { RootState } from "@/redux/store";
import { selectFestival } from "@/redux/slices/festivalSlice";
import { selectVenue } from "@/redux/slices/venueSlice";
import { selectResidency } from "@/redux/slices/residencySlice";
import { selectApplication } from "@/redux/slices/applicationSlice";
import { selectProfile } from "@/redux/slices/authSlice";
import { capitalizeFirst } from "@/utils/stringUtils";
import { Action } from "@/interfaces/Enums";
import { entityRegistry } from "./breadcrumbsConfig";
import { Home } from "lucide-react";
import path from "path";

export interface Breadcrumb {
  path: string;
  label: React.ReactNode;
}

export interface EntityData {
  id?: number;
  name?: string;
  organisationName?: string;
}

export const buildBreadcrumbs = (pathname: string, entityName?: string): Breadcrumb[] => {
  const crumbs: Breadcrumb[] = [{ path: "/", label: <Home className="text-primary" /> }];
  const segments = pathname.split("/").filter(Boolean);

  const entityKey = segments[0];
  const config = entityRegistry[entityKey];

  if (!config) {
    crumbs.push({ path: "#", label: "Dashboard" });
    return crumbs;
  }

  crumbs.push({ path: `/${entityKey}`, label: config.label });

  const id = segments[1];

  if (!id || id === "create") {
    if (id === "create") crumbs.push({ path: pathname, label: "Create" });
    return crumbs;
  }

  const name = entityName ?? `ID: ${id}`;
  crumbs.push({ path: config.hasDetailsView ? `/${entityKey}/${id}` : "#", label: name });

  const action = segments[2];
  if (segments[2]) {
    crumbs.push({ path: pathname, label: capitalizeFirst(action) });
  }

  return crumbs;
};
