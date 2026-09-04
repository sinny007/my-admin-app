import React, { useState } from 'react';
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import UserStatusCard from '../components/UserStatusCard';
import ReportExportModule from '../components/ReportExportModule';
import SearchFilterBar from '../components/SearchFilterBar';
import DataTableWithPagination from '../components/DataTableWithPagination';

export default function DashboardPage() {
  // State สำหรับข้อ 5 และ 6
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* ข้อ 1: Auth & User Status */}
        <UserStatusCard />

        {/* ข้อ 8: MIS Report Export Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ระบบจัดการข้อมูล</h1>
          <ReportExportModule />
        </div>

        {/* ข้อ 5: Search & Filter Bar */}
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        {/* ข้อ 6: Data Table & Pagination */}
        <DataTableWithPagination 
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </main>
    </div>
  );
}