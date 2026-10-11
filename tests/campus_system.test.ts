import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { dbService, initDatabase } from '../src/db/database';

describe('Campus Activity & Event Intelligence System - Test Suite', () => {
  beforeAll(() => {
    // กำหนดค่าเริ่มต้นและฐานข้อมูลจำลองสำหรับชุดทดสอบ
    initDatabase();
  });

  // -------------------------------------------------------------
  // TC-01: Authentication & User Verification
  // -------------------------------------------------------------
  describe('Module 1: Authentication & User Verification (TC-AUTH)', () => {
    it('TC-AUTH-001: ควรค้นหาบัญชีนิสิตด้วยอีเมลและได้ Role เป็น STUDENT', async () => {
      const student = await dbService.getUserByEmailOrStudentId('student@up.ac.th');
      expect(student).toBeDefined();
      expect(student?.email).toBe('student@up.ac.th');
      expect(student?.role).toBe('student');
      expect(student?.student_id).toBe('66020101');
      expect(student?.university_verified).toBeTruthy();
    });

    it('TC-AUTH-002: ควรค้นหาบัญชีผู้จัดด้วยอีเมลและได้ Role เป็น ORGANIZER', async () => {
      const organizer = await dbService.getUserByEmailOrStudentId('somchai.n@up.ac.th');
      expect(organizer).toBeDefined();
      expect(organizer?.email).toBe('somchai.n@up.ac.th');
      expect(organizer?.role).toBe('organizer');
      expect(organizer?.university_verified).toBeTruthy();
    });

    it('TC-AUTH-003: ควรค้นหาบัญชีนิสิตด้วยรหัสนิสิต (Student ID) ได้ถูกต้อง', async () => {
      const user = await dbService.getUserByEmailOrStudentId('66030214');
      expect(user).toBeDefined();
      expect(user?.name).toBe('น.ส.กานต์พิชชา รัตนคุณ');
      expect(user?.faculty).toBe('คณะวิศวกรรมศาสตร์');
    });

    it('TC-AUTH-004: กรณีค้นหาผู้ใช้ที่ไม่มีในระบบ ต้องคืนค่า null', async () => {
      const notFoundUser = await dbService.getUserByEmailOrStudentId('unknown@up.ac.th');
      expect(notFoundUser).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // TC-02: Activity Creation & Management
  // -------------------------------------------------------------
  describe('Module 2: Activity Creation & Management (TC-ACT)', () => {
    let createdActivityId: number;

    it('TC-ACT-001: ผู้จัด (Organizer) สามารถสร้างกิจกรรมใหม่พร้อมกำหนดจำนวนที่นั่งได้สำเร็จ', async () => {
      const organizer = await dbService.getUserByEmailOrStudentId('somchai.n@up.ac.th');
      expect(organizer).toBeDefined();

      const newActivity = await dbService.createActivity({
        title: 'โครงการทดสอบระบบอัตโนมัติ 2026',
        description: 'การทดสอบฟังก์ชันสร้างและลงทะเบียนกิจกรรม',
        start_date: '2026-11-20T09:00:00Z',
        end_date: '2026-11-20T12:00:00Z',
        location: 'ห้องประชุม ICT-101',
        category: 'Technology & Academic',
        max_participants: 50,
        organizer_id: organizer!.id,
        organizer_name: organizer!.name,
        organizer_faculty: organizer!.faculty,
        tags: ['วิชาการ', 'ไอที'],
      });

      expect(newActivity).toBeDefined();
      expect(newActivity.id).toBeDefined();
      expect(newActivity.title).toBe('โครงการทดสอบระบบอัตโนมัติ 2026');
      expect(newActivity.max_participants).toBe(50);
      expect(newActivity.current_confirmed).toBe(0);

      createdActivityId = newActivity.id;
    });

    it('TC-ACT-002: สามารถดึงข้อมูลกิจกรรมผ่าน ID ได้อย่างถูกต้อง', async () => {
      const act = await dbService.getActivityById(createdActivityId);
      expect(act).toBeDefined();
      expect(act?.id).toBe(createdActivityId);
      expect(act?.organizer_name).toBe('ดร.สมชาย นพคุณ (สโมสรนักศึกษา)');
    });
  });

  // -------------------------------------------------------------
  // TC-03: Registration & Waitlist System
  // -------------------------------------------------------------
  describe('Module 3: Registration & Waitlist (TC-REG)', () => {
    let limitedActivityId: number;
    let student1Id: number;
    let student2Id: number;

    beforeAll(async () => {
      const org = await dbService.getUserByEmailOrStudentId('somchai.n@up.ac.th');
      const act = await dbService.createActivity({
        title: 'กิจกรรมจำกัดที่นั่ง 1 คนสำหรับทดสอบคิวสำรอง ' + Date.now(),
        description: 'จำกัด 1 ที่นั่งเพื่อทดสอบ Waitlist อัตโนมัติ',
        start_date: '2026-12-01T13:00:00Z',
        end_date: '2026-12-01T16:00:00Z',
        location: 'Lab 3 ICT',
        category: 'Technology & Academic',
        max_participants: 1, // จำกัดแค่ 1 ที่นั่ง
        organizer_id: org!.id,
        organizer_name: org!.name,
      });
      limitedActivityId = act.id;

      const s1 = await dbService.getUserByEmailOrStudentId('student@up.ac.th');
      const s2 = await dbService.getUserByEmailOrStudentId('kanpicha.r@up.ac.th');
      student1Id = s1!.id;
      student2Id = s2!.id;
    });

    it('TC-REG-001: นิสิตคนแรกสามารถลงทะเบียนได้สถานะ CONFIRMED (ที่นั่งเต็ม 1/1)', async () => {
      const reg1 = await dbService.createRegistration({
        user_id: student1Id,
        activity_id: limitedActivityId,
        status: 'CONFIRMED',
        qr_token: crypto.randomUUID(),
      });
      expect(reg1).toBeDefined();
      expect(reg1.status).toBe('CONFIRMED');

      const act = await dbService.getActivityById(limitedActivityId);
      expect(act?.current_confirmed).toBe(1);
      expect(act?.is_full).toBe(true);
    });

    it('TC-REG-002: นิสิตคนที่สองลงทะเบียนเมื่อที่นั่งเต็ม จะได้สถานะ WAITING (คิวสำรอง)', async () => {
      const reg2 = await dbService.createRegistration({
        user_id: student2Id,
        activity_id: limitedActivityId,
        status: 'WAITING',
        qr_token: crypto.randomUUID(),
      });
      expect(reg2).toBeDefined();
      expect(reg2.status).toBe('WAITING');

      const act = await dbService.getActivityById(limitedActivityId);
      expect(act?.current_waiting).toBe(1);
    });

    it('TC-REG-003: ตรวจสอบการลงทะเบียนซ้ำซ้อนด้วย findUserRegistration', async () => {
      const existing = await dbService.findUserRegistration(limitedActivityId, student1Id);
      expect(existing).not.toBeNull();
      expect(existing?.status).toBe('CONFIRMED');
    });

    it('TC-REG-004: เมื่อผู้ได้ที่นั่งตัวจริงยกเลิก ระบบต้องเลื่อนคิวสำรอง (WAITING) ขึ้นมาเป็นตัวจริง (CONFIRMED) ทันที', async () => {
      const cancelResult = await dbService.cancelRegistration(limitedActivityId, student1Id);
      expect(cancelResult.cancelledReg).not.toBeNull();
      expect(cancelResult.cancelledReg?.status).toBe('CANCELLED');

      // ตรวจสอบว่าคิวสำรอง (student2Id) ถูกเลื่อนสถานะเป็น CONFIRMED อัตโนมัติ
      expect(cancelResult.promotedReg).not.toBeNull();
      expect(cancelResult.promotedReg?.user_id).toBe(student2Id);
      expect(cancelResult.promotedReg?.status).toBe('CONFIRMED');

      const updatedReg2 = await dbService.getRegistrationById(cancelResult.promotedReg!.id);
      expect(updatedReg2?.status).toBe('CONFIRMED');
    });
  });

  // -------------------------------------------------------------
  // TC-04: QR Code Check-in & Dashboard Analytics
  // -------------------------------------------------------------
  describe('Module 4: Check-in & Dashboard Analytics (TC-CHECKIN)', () => {
    let checkinActId: number;
    let checkinRegId: number;
    let checkinToken: string;
    let studentId: number;

    beforeAll(async () => {
      const org = await dbService.getUserByEmailOrStudentId('somchai.n@up.ac.th');
      const student = await dbService.getUserByEmailOrStudentId('student@up.ac.th');
      studentId = student!.id;

      const act = await dbService.createActivity({
        title: 'สัมมนาการใช้งาน QR Code และวิเคราะห์ข้อมูล ' + Date.now(),
        description: 'ทดสอบการเช็คอินด้วย QR Code',
        start_date: '2026-11-25T10:00:00Z',
        end_date: '2026-11-25T12:00:00Z',
        location: 'ห้องประชุม IT-Hall',
        category: 'Technology & Academic',
        max_participants: 10,
        organizer_id: org!.id,
        organizer_name: org!.name,
      });
      checkinActId = act.id;

      checkinToken = crypto.randomUUID();
      const reg = await dbService.createRegistration({
        user_id: studentId,
        activity_id: checkinActId,
        status: 'CONFIRMED',
        qr_token: checkinToken,
      });
      checkinRegId = reg.id;
    });

    it('TC-CHECKIN-001: ผู้เข้าร่วมสามารถเช็คอินเข้าร่วมกิจกรรมได้สำเร็จ (checked_in_at ถูกบันทึก)', async () => {
      const checkinResult = await dbService.checkIn(checkinRegId);
      expect(checkinResult).toBeDefined();
      expect(checkinResult?.checked_in_at).toBeDefined();
      expect(checkinResult?.checked_in_at).not.toBeNull();

      const allRegs = await dbService.getRegistrationsByActivity(checkinActId);
      const checkedInCount = allRegs.filter((r) => r.checked_in_at !== null).length;
      expect(checkedInCount).toBe(1);
    });

    it('TC-CHECKIN-002: สามารถค้นหาข้อมูลใบลงทะเบียนผ่าน QR Token ได้ถูกต้อง', async () => {
      const regByToken = await dbService.getRegistrationByToken(checkinToken);
      expect(regByToken).not.toBeNull();
      expect(regByToken?.id).toBe(checkinRegId);
      expect(regByToken?.checked_in_at).not.toBeNull();
    });
  });

  // -------------------------------------------------------------
  // TC-05: Activity Deletion & Integrity
  // -------------------------------------------------------------
  describe('Module 5: Deletion & Database Integrity (TC-DELETE)', () => {
    it('TC-DELETE-001: ผู้จัดสามารถลบกิจกรรมได้ และข้อมูลการลงทะเบียนต้องถูกลบตาม (Cascade Delete)', async () => {
      const org = await dbService.getUserByEmailOrStudentId('somchai.n@up.ac.th');
      const student = await dbService.getUserByEmailOrStudentId('student@up.ac.th');

      const act = await dbService.createActivity({
        title: 'กิจกรรมทดสอบการลบ Cascade ' + Date.now(),
        description: 'จะถูกลบเพื่อทดสอบความถูกต้องของฐานข้อมูล',
        start_date: '2026-12-10T09:00:00Z',
        end_date: '2026-12-10T10:00:00Z',
        location: 'สนามฟุตบอล 1',
        category: 'Sports & Fitness',
        max_participants: 5,
        organizer_id: org!.id,
        organizer_name: org!.name,
      });

      await dbService.createRegistration({
        user_id: student!.id,
        activity_id: act.id,
        status: 'CONFIRMED',
        qr_token: crypto.randomUUID(),
      });

      const deleteResult = await dbService.deleteActivity(act.id);
      expect(deleteResult).toBe(true);

      const deletedAct = await dbService.getActivityById(act.id);
      expect(deletedAct).toBeNull();

      const regsRemaining = await dbService.getRegistrationsByActivity(act.id);
      expect(regsRemaining.length).toBe(0);
    });
  });
});