import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/data/staff_db.json');

export type AttendanceStatus = 'P' | 'A' | 'HD' | 'PL' | 'WO' | null;

export interface Advance {
    id: string;
    date: string;
    amount: number;
    description: string;
}

export interface Staff {
    id: string;
    name: string;
    mobile: string;
    monthlySalary: number;
    advances: Advance[];
}

export interface StaffDBSchema {
    settings: {
        enableReminder: boolean;
        reminderTime: string;
        markPresentDefault: boolean;
        workingHours: { hrs: number, mins: number };
        weeklyOffs: string[];
    };
    staff: Staff[];
    attendance: {
        // e.g. "2026-04-09": { "staff_uuid": { status: "P", overtime: 2 } }
        [date: string]: {
            [staffId: string]: {
                status: AttendanceStatus;
                overtime: number;
            }
        }
    };
}

const defaultDB: StaffDBSchema = {
    settings: {
        enableReminder: true,
        reminderTime: "10:00",
        markPresentDefault: false,
        workingHours: { hrs: 8, mins: 0 },
        weeklyOffs: ["Sun"]
    },
    staff: [],
    attendance: {}
};

export function readStaffDB(): StaffDBSchema {
    try {
        if (!fs.existsSync(dbPath)) {
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2), 'utf8');
            return JSON.parse(JSON.stringify(defaultDB));
        }
        const raw = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return JSON.parse(JSON.stringify(defaultDB));
    }
}

export function writeStaffDB(data: StaffDBSchema) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing staff DB:", error);
    }
}
