"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updatePair, updateGroup } from "@/lib/supabase-queries";
import { Pair, Group } from "@/types";

interface UsePairSwapProps {
  onSwapComplete: () => void;
}

export function usePairSwap({ onSwapComplete }: UsePairSwapProps) {
  const [isSwapping, setIsSwapping] = useState(false);

  const swapPairs = async (pairA: Pair, pairB: Pair, groups: Group[]) => {
    if (isSwapping) return;

    try {
      setIsSwapping(true);

      // Encontrar los grupos de las parejas
      const groupA = groups.find((group) => group.pairIds.includes(pairA.id));
      const groupB = groups.find((group) => group.pairIds.includes(pairB.id));

      if (!groupA || !groupB) {
        throw new Error("No se encontraron los grupos de las parejas");
      }

      // Si las parejas están en el mismo grupo, no hacer nada
      if (groupA.id === groupB.id) {
        toast.info("Las parejas ya están en el mismo grupo");
        return;
      }

      // Actualizar los pairIds de los grupos
      const newPairIdsA = groupA.pairIds
        .filter((id) => id !== pairA.id)
        .concat(pairB.id);
      const newPairIdsB = groupB.pairIds
        .filter((id) => id !== pairB.id)
        .concat(pairA.id);

      // Actualizar ambos grupos
      await Promise.all([
        updateGroup(groupA.id, {
          categoryId: groupA.categoryId,
          name: groupA.name,
          pairIds: newPairIdsA,
        }),
        updateGroup(groupB.id, {
          categoryId: groupB.categoryId,
          name: groupB.name,
          pairIds: newPairIdsB,
        }),
      ]);

      toast.success("Parejas intercambiadas exitosamente");
      onSwapComplete();
    } catch (error) {
      console.error("Error swapping pairs:", error);
      toast.error("Error al intercambiar las parejas");
    } finally {
      setIsSwapping(false);
    }
  };

  const movePairToGroup = async (
    pair: Pair,
    targetGroupId: string,
    groups: Group[]
  ) => {
    if (isSwapping) return;

    try {
      setIsSwapping(true);

      // Encontrar el grupo actual de la pareja
      const currentGroup = groups.find((group) =>
        group.pairIds.includes(pair.id)
      );

      if (!currentGroup) {
        throw new Error("No se encontró el grupo actual de la pareja");
      }

      // Si ya está en el grupo objetivo, no hacer nada
      if (currentGroup.id === targetGroupId) {
        toast.info("La pareja ya está en este grupo");
        return;
      }

      // Encontrar el grupo objetivo
      const targetGroup = groups.find((group) => group.id === targetGroupId);
      if (!targetGroup) {
        throw new Error("No se encontró el grupo objetivo");
      }

      // Actualizar los pairIds de ambos grupos
      const newCurrentGroupPairIds = currentGroup.pairIds.filter(
        (id) => id !== pair.id
      );
      const newTargetGroupPairIds = [...targetGroup.pairIds, pair.id];

      // Actualizar ambos grupos
      await Promise.all([
        updateGroup(currentGroup.id, {
          categoryId: currentGroup.categoryId,
          name: currentGroup.name,
          pairIds: newCurrentGroupPairIds,
        }),
        updateGroup(targetGroup.id, {
          categoryId: targetGroup.categoryId,
          name: targetGroup.name,
          pairIds: newTargetGroupPairIds,
        }),
      ]);

      toast.success("Pareja movida exitosamente");
      onSwapComplete();
    } catch (error) {
      console.error("Error moving pair:", error);
      toast.error("Error al mover la pareja");
    } finally {
      setIsSwapping(false);
    }
  };

  return {
    swapPairs,
    movePairToGroup,
    isSwapping,
  };
}
