import { selectProfile } from "@/redux/slices/authSlice";
import { selectApplication } from "@/redux/slices/applicationSlice";
import { selectVenue } from "@/redux/slices/venueSlice";
import { selectFestival } from "@/redux/slices/festivalSlice";
import { selectResidency } from "@/redux/slices/residencySlice";
import { RootState } from "@/redux/store";

export interface EntityConfig {
  label: string;
  selectName?: (state: RootState, id: string) => string | undefined;
  hasDetailsView: boolean;
}

export const entityRegistry: Record<string, EntityConfig> = {
  festivals: {
    label: "Festivals",
    selectName: (state, id) => {
      return selectFestival(state, Number(id))?.name;
    },
    hasDetailsView: true,
  },
  venues: {
    label: "Venues",
    selectName: (state, id) => {
      return selectVenue(state, Number(id))?.name;
    },
    hasDetailsView: true,
  },
  residencies: {
    label: "Residencies",
    selectName: (state, id) => {
      return selectResidency(state, Number(id))?.name;
    },
    hasDetailsView: true,
  },
  applications: {
    label: "Applications",
    selectName: (state, id) => {
      return selectApplication(state, Number(id))?.organisation.name;
    },
    hasDetailsView: true,
  },
  profile: {
    label: "Profile",
    selectName: (state) => {
      return selectProfile(state)?.email;
    },
    hasDetailsView: false,
  },
  help: {
    label: "Help",
    hasDetailsView: false,
  },
  upload: {
    label: "Upload",
    hasDetailsView: false,
  },
  report: {
    label: "Report bug",
    hasDetailsView: false,
  },
  "report-bug": {
    label: "Report bug",
    hasDetailsView: false,
  },
  preferences: {
    label: "Preferences",
    hasDetailsView: false,
  },
};
