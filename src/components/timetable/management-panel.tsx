/**
 * Management panel for CRUD operations on centres, rooms, courses, and teachers.
 * @module components/timetable/management-panel
 */

'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Building, DoorOpen, BookOpen, Users, Settings, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useCentres, useCreateCentre, useDeleteCentre } from '@/hooks/use-centres';
import { useRooms, useCreateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useCourses, useCreateCourse, useDeleteCourse } from '@/hooks/use-courses';
import { useTeachers, useCreateTeacher, useDeleteTeacher } from '@/hooks/use-teachers';

type ManagementTab = 'centres' | 'rooms' | 'courses' | 'teachers';

export function ManagementPanel() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('centres');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 px-4">
          <TabButton
            icon={<Building className="w-4 h-4" />}
            label="Centres"
            active={activeTab === 'centres'}
            onClick={() => setActiveTab('centres')}
          />
          <TabButton
            icon={<DoorOpen className="w-4 h-4" />}
            label="Rooms"
            active={activeTab === 'rooms'}
            onClick={() => setActiveTab('rooms')}
          />
          <TabButton
            icon={<BookOpen className="w-4 h-4" />}
            label="Courses"
            active={activeTab === 'courses'}
            onClick={() => setActiveTab('courses')}
          />
          <TabButton
            icon={<Users className="w-4 h-4" />}
            label="Teachers"
            active={activeTab === 'teachers'}
            onClick={() => setActiveTab('teachers')}
          />
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'centres' && <CentresManager />}
        {activeTab === 'rooms' && <RoomsManager />}
        {activeTab === 'courses' && <CoursesManager />}
        {activeTab === 'teachers' && <TeachersManager />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ icon, label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CentresManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const { data: centres, isLoading } = useCentres();
  const createCentre = useCreateCentre();
  const deleteCentre = useDeleteCentre();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCentre.mutateAsync({ name: name.trim(), address: address.trim() || null });
    setName('');
    setAddress('');
    setShowForm(false);
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Centres</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Centre
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Centre name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {centres?.map((centre) => (
          <div
            key={centre.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900">{centre.name}</div>
              {centre.address && (
                <div className="text-sm text-gray-500">{centre.address}</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/admin/centres/${centre.id}/google-settings`}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Google Calendar Settings"
              >
                <Calendar className="w-4 h-4" />
              </Link>
              <button
                onClick={() => deleteCentre.mutate(centre.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {centres?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No centres yet</div>
        )}
      </div>
    </div>
  );
}

function RoomsManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [centreId, setCentreId] = useState('');
  const { data: rooms, isLoading } = useRooms();
  const { data: centres } = useCentres();
  const createRoom = useCreateRoom();
  const deleteRoom = useDeleteRoom();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !centreId) return;
    await createRoom.mutateAsync({ centreId, name: name.trim() });
    setName('');
    setCentreId('');
    setShowForm(false);
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Rooms</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <select
            value={centreId}
            onChange={(e) => setCentreId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          >
            <option value="">Select centre</option>
            {centres?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rooms?.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900">{room.name}</div>
              <div className="text-sm text-gray-500">{room.centre.name}</div>
            </div>
            <button
              onClick={() => deleteRoom.mutate(room.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rooms?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No rooms yet</div>
        )}
      </div>
    </div>
  );
}

function CoursesManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [colorHex, setColorHex] = useState('#3b82f6');
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    await createCourse.mutateAsync({
      name: name.trim(),
      category: category.trim(),
      colorHex,
    });
    setName('');
    setCategory('');
    setShowForm(false);
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Courses</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Course name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="Category (e.g., IELTS, General English)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Color:</label>
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {courses?.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: course.colorHex ?? '#3b82f6' }}
              />
              <div>
                <div className="font-medium text-gray-900">{course.name}</div>
                <div className="text-sm text-gray-500">{course.category}</div>
              </div>
            </div>
            <button
              onClick={() => deleteCourse.mutate(course.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {courses?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No courses yet</div>
        )}
      </div>
    </div>
  );
}

function TeachersManager() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { data: teachers, isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();
  const deleteTeacher = useDeleteTeacher();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTeacher.mutateAsync({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    setName('');
    setEmail('');
    setPhone('');
    setShowForm(false);
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Teachers</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Teacher name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {teachers?.map((teacher) => (
          <div
            key={teacher.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900">{teacher.name}</div>
              {teacher.email && (
                <div className="text-sm text-gray-500">{teacher.email}</div>
              )}
            </div>
            <button
              onClick={() => deleteTeacher.mutate(teacher.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {teachers?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No teachers yet</div>
        )}
      </div>
    </div>
  );
}
