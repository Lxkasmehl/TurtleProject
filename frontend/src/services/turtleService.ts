import type { TurtleRecord } from '../types/turtle';

// This simulates a database delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_DATA: TurtleRecord[] = [
  {
    id: 'F001',
    originalSite: 'CPBS',
    name: 'Uno',
    sex: 'Female',
    dateLastSeen: '6/7/2022',
    lastFoundBy: 'Mason Chanay',
    locationDescription: 'near Weather Station',
    recaptureHistory: '6/7/2022',
    dateFirstFound: '6/7/2022',
    health: '2025',
    dateLastBehavior: '',
    generalNotes: '',
  },
  {
    id: 'F006',
    originalSite: 'CPBS',
    name: 'Sage',
    sex: 'Female',
    dateLastSeen: '6/27/2022',
    lastFoundBy: 'Aubrey Gauntt',
    locationDescription: 'along Weather Station trail',
    recaptureHistory: '6/27/2022',
    dateFirstFound: '6/27/2022',
    health: '2025',
    dateLastBehavior: '',
    generalNotes: '',
  },
  // Added a placeholder for the empty data structure you might need later
];

export const TurtleService = {
  // Fetch all records
  getAllRecords: async (): Promise<TurtleRecord[]> => {
    await delay(500); // Fake loading time
    // Check if we have data in localStorage, otherwise use MOCK_DATA
    const stored = localStorage.getItem('turtle_records');
    if (stored) {
      return JSON.parse(stored);
    }
    return MOCK_DATA;
  },

  // Save records (Simulates saving to backend, currently saves to browser memory)
  saveRecords: async (records: TurtleRecord[]): Promise<void> => {
    await delay(300);
    localStorage.setItem('turtle_records', JSON.stringify(records));
  }
};