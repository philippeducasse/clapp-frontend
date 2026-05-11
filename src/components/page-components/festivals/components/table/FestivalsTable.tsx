"use client";
import { useState, useCallback, useMemo } from "react";
import { Festival } from "@/interfaces/entities/Festival";
import { PaginatedResponse } from "@/interfaces/table/PaginatedResponse";
import { useFestivalColumns } from "../../helpers/useFestivalColumns";
import { DataTable } from "@/components/common/table/DataTable";
import { useDispatch } from "react-redux";
import { setFestivals, deleteFestival } from "@/redux/slices/festivalSlice";
import { EntityName } from "@/interfaces/Enums";
import { festivalApiService } from "@/api/festivalApiService";
import { getFestivalFilters } from "../../helpers/getFestivalFilters";
import { DeleteModal } from "@/components/common/modals/DeleteModal";

interface FestivalsTableProps {
  initialData: PaginatedResponse<Festival>;
}

export const FestivalsTable = ({ initialData }: FestivalsTableProps) => {
  const dispatch = useDispatch();
  const [festivalData, setFestivalData] = useState<PaginatedResponse<Festival>>(initialData);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteFestivalId, setDeleteFestivalId] = useState<number | null>(null);

  const handleDeleteClick = useCallback((id: number) => {
    setDeleteFestivalId(id);
    setOpenDeleteModal(true);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (deleteFestivalId === null) return;
    await festivalApiService.remove(deleteFestivalId);

    // Update local state by filtering out the deleted festival
    setFestivalData((prev) => ({
      ...prev,
      results: prev.results.filter((festival) => festival.id !== deleteFestivalId),
      count: prev.count - 1,
    }));

    // Also update Redux for consistency
    dispatch(deleteFestival(deleteFestivalId));
    setDeleteFestivalId(null);
  }, [deleteFestivalId, dispatch]);

  const handleDataFetched = useCallback(
    (data: PaginatedResponse<Festival>) => {
      setFestivalData(data);
      dispatch(setFestivals(data.results));
    },
    [dispatch],
  );

  const columns = useFestivalColumns({ onDeleteClick: handleDeleteClick });

  const filters = useMemo(() => getFestivalFilters(), []);

  return (
    <>
      <DeleteModal
        open={openDeleteModal}
        onOpenChange={setOpenDeleteModal}
        onConfirm={onConfirmDelete}
        itemName="festival"
      />
      <DataTable
        columns={columns}
        data={festivalData.results}
        entityName={EntityName.FESTIVAL}
        totalCount={festivalData.count}
        filters={filters}
        fetchData={festivalApiService.getAll}
        onDataFetched={handleDataFetched}
      />
    </>
  );
};
