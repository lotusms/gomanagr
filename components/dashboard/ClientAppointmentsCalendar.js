import { useState } from 'react';
import { HiChevronRight } from 'react-icons/hi';

/**
 * Client Appointments Calendar Component (Year View)
 */
export default function ClientAppointmentsCalendar({ appointments = [], userAccount, onAppointmentClick }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  const getAppointmentsForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter((apt) => {
      const aptDate = typeof apt.date === 'string' ? apt.date : new Date(apt.date).toISOString().split('T')[0];
      return aptDate === dateStr;
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedYear(selectedYear - 1);
                setSelectedMonth(11);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <HiChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {months[selectedMonth]} {selectedYear}
          </h3>
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedYear(selectedYear + 1);
                setSelectedMonth(0);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        
        {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[100px]"></div>
        ))}
        
        {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, idx) => {
          const day = idx + 1;
          const dayAppointments = getAppointmentsForDate(selectedYear, selectedMonth, day);
          
          return (
            <div
              key={day}
              className={`min-h-[100px] border border-gray-100 dark:border-gray-700 p-2 ${
                dayAppointments.length > 0 ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{day}</div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt, aptIdx) => {
                  const timeFormat = userAccount?.timeFormat ?? '24h';
                  let displayTime = '';
                  if (apt.time) {
                    if (timeFormat === '12h') {
                      const [hours, minutes] = apt.time.split(':');
                      const hour12 = parseInt(hours) % 12 || 12;
                      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
                      displayTime = `${hour12}:${minutes} ${ampm}`;
                    } else {
                      displayTime = apt.time;
                    }
                  }
                  const serviceNames = apt.services || [];
                  const firstService = serviceNames[0] || '';
                  const displayText = displayTime ? `${displayTime} - ${firstService}` : firstService;
                  
                  return (
                    <button
                      key={aptIdx}
                      type="button"
                      onClick={() => onAppointmentClick(apt)}
                      className="w-full text-left px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 truncate"
                    >
                      {displayText}
                    </button>
                  );
                })}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
