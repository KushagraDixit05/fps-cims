// src/hooks/useLocationHierarchy.ts
// Shared hook: District → Block → Village cascading dropdown logic.
// Used by CMM Step1_FarmerDetails and ProductDemo Step1_FarmerDetails.
// Offline-first: reads WatermelonDB cache for districts & blocks; fetches
// villages from API (not locally cached, fast and stateless).

import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import { DistrictModel } from '../database/models/DistrictModel';
import { BlockModel }    from '../database/models/BlockModel';
import { VillageModel }  from '../database/models/VillageModel';
import { getDistricts, getBlocks, getVillages } from '../api/cropMonitoring';
import type { District, Block, VillageMaster } from '../types/cropMonitoring';

export interface LocationSelection {
  district_name: string;
  district_id: number | null;
  block_name: string;
  block_id: number | null;
  village_name: string;
  village_id: number | null;
  custom_village_name: string;
}

interface UseLocationHierarchyReturn {
  districts: District[];
  blocks: Block[];
  villages: VillageMaster[];
  loadingDistricts: boolean;
  loadingBlocks: boolean;
  loadingVillages: boolean;
  handleDistrictSelect: (districtName: string, onChange: (s: Partial<LocationSelection>) => void) => void;
  handleBlockSelect: (blockName: string, onChange: (s: Partial<LocationSelection>) => void) => void;
  handleVillageSelect: (villageName: string, onChange: (s: Partial<LocationSelection>) => void) => void;
}

export const useLocationHierarchy = (
  currentDistrictName: string,
  currentBlockName: string,
): UseLocationHierarchyReturn => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [villages, setVillages]   = useState<VillageMaster[]>([]);

  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId]       = useState<number | null>(null);

  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingBlocks, setLoadingBlocks]       = useState(false);
  const [loadingVillages, setLoadingVillages]   = useState(false);

  // ── Load districts on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const local = await database.collections
          .get<DistrictModel>('districts')
          .query()
          .fetch();

        if (local.length > 0) {
          setDistricts(local.map(d => ({ id: d.serverId, name: d.name, state: d.state ?? '' })));
        } else {
          const api = await getDistricts();
          setDistricts(api);
        }
      } catch { /* silently fall back to empty */ }
      finally { setLoadingDistricts(false); }
    };
    load();
  }, []);

  // ── Load blocks when district changes ──────────────────────────────────────
  useEffect(() => {
    if (selectedDistrictId === null) return;
    setLoadingBlocks(true);
    setBlocks([]);
    setVillages([]);

    const load = async () => {
      try {
        const local = await database.collections
          .get<BlockModel>('blocks')
          .query(Q.where('district_server_id', selectedDistrictId))
          .fetch();

        if (local.length > 0) {
          setBlocks(local.map(b => ({
            id:            b.serverId,
            name:          b.name,
            district:      b.districtServerId,
            district_name: b.districtName ?? '',
          })));
        } else {
          const api = await getBlocks(selectedDistrictId);
          setBlocks(api);
        }
      } catch { setBlocks([]); }
      finally { setLoadingBlocks(false); }
    };
    load();
  }, [selectedDistrictId]);

  // ── Load villages when block changes ──────────────────────────────────────
  useEffect(() => {
    if (selectedBlockId === null) return;
    setLoadingVillages(true);
    setVillages([]);

    const load = async () => {
      try {
        // Try local cache first
        const local = await database.collections
          .get<VillageModel>('villages')
          .query(Q.where('block_server_id', selectedBlockId))
          .fetch();

        if (local.length > 0) {
          setVillages(local.map(v => ({
            id:           v.serverId,
            name:         v.name,
            block:        v.blockServerId,
            block_name:   v.blockName ?? '',
            district_name: '',
          })));
        } else {
          const api = await getVillages(selectedBlockId);
          setVillages(api);
        }
      } catch { setVillages([]); }
      finally { setLoadingVillages(false); }
    };
    load();
  }, [selectedBlockId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDistrictSelect = useCallback((
    districtName: string,
    onChange: (s: Partial<LocationSelection>) => void,
  ) => {
    const district = districts.find(d => d.name === districtName);
    setSelectedDistrictId(district?.id ?? null);
    setSelectedBlockId(null);
    setBlocks([]);
    setVillages([]);
    onChange({
      district_name:       districtName,
      district_id:         district?.id ?? null,
      block_name:          '',
      block_id:            null,
      village_name:        '',
      village_id:          null,
      custom_village_name: '',
    });
  }, [districts]);

  const handleBlockSelect = useCallback((
    blockName: string,
    onChange: (s: Partial<LocationSelection>) => void,
  ) => {
    const block = blocks.find(b => b.name === blockName);
    setSelectedBlockId(block?.id ?? null);
    setVillages([]);
    onChange({
      block_name:          blockName,
      block_id:            block?.id ?? null,
      village_name:        '',
      village_id:          null,
      custom_village_name: '',
    });
  }, [blocks]);

  const handleVillageSelect = useCallback((
    villageName: string,
    onChange: (s: Partial<LocationSelection>) => void,
  ) => {
    const village = villages.find(v => v.name === villageName);
    onChange({
      village_name: villageName,
      village_id:   village?.id ?? null,
    });
  }, [villages]);

  return {
    districts,
    blocks,
    villages,
    loadingDistricts,
    loadingBlocks,
    loadingVillages,
    handleDistrictSelect,
    handleBlockSelect,
    handleVillageSelect,
  };
};
