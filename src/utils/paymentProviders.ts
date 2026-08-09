export const DEFAULT_MOMO_NETWORKS = [
  'MTN Mobile Money',
  'Telecel Cash',
  'AT Money',
];

export const DEFAULT_BANKS = [
  'Ecobank Ghana',
  'GCB Bank',
  'CalBank',
  'Stanbic Bank',
  'Absa Bank',
  'Fidelity Bank',
  'Zenith Bank',
  'GTBank',
  'Access Bank',
  'First National Bank',
  'CBG (Consolidated Bank Ghana)',
];

const MOMO_STORAGE_KEY = 'pos_custom_momo_networks';
const BANK_STORAGE_KEY = 'pos_custom_banks';

export function getMoMoNetworkOptions(): Array<{ value: string; label: string }> {
  let custom: string[] = [];
  try {
    const saved = localStorage.getItem(MOMO_STORAGE_KEY);
    if (saved) custom = JSON.parse(saved);
  } catch (e) {
    console.error('Failed to read custom MoMo networks', e);
  }

  const all = Array.from(new Set([...DEFAULT_MOMO_NETWORKS, ...custom]));
  const options = all.map((name) => ({ value: name, label: name }));
  options.push({ value: 'other', label: '+ Add Other Network...' });
  return options;
}

export function saveCustomMoMoNetwork(name: string) {
  if (!name || DEFAULT_MOMO_NETWORKS.includes(name)) return;
  try {
    const saved = localStorage.getItem(MOMO_STORAGE_KEY);
    const list: string[] = saved ? JSON.parse(saved) : [];
    if (!list.includes(name)) {
      list.push(name);
      localStorage.setItem(MOMO_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to save custom MoMo network', e);
  }
}

export function getBankOptions(): Array<{ value: string; label: string }> {
  let custom: string[] = [];
  try {
    const saved = localStorage.getItem(BANK_STORAGE_KEY);
    if (saved) custom = JSON.parse(saved);
  } catch (e) {
    console.error('Failed to read custom banks', e);
  }

  const all = Array.from(new Set([...DEFAULT_BANKS, ...custom]));
  const options = all.map((name) => ({ value: name, label: name }));
  options.push({ value: 'other', label: '+ Add Other Bank...' });
  return options;
}

export function saveCustomBank(name: string) {
  if (!name || DEFAULT_BANKS.includes(name)) return;
  try {
    const saved = localStorage.getItem(BANK_STORAGE_KEY);
    const list: string[] = saved ? JSON.parse(saved) : [];
    if (!list.includes(name)) {
      list.push(name);
      localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to save custom bank', e);
  }
}
