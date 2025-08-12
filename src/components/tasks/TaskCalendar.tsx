import { useState, useMemo } from "react";
import { Calendar, momentLocalizer, Views, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br";
import { Task } from "@/types/api";
import { getTaskStatus, getStatusColor } from "@/utils/taskStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  LayoutGrid
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";

// Configurar moment para português
moment.locale("pt-br");
const localizer = momentLocalizer(moment);

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

export function TaskCalendar({ tasks, onTaskClick }: TaskCalendarProps) {
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const clientDeletedIds = useMemo(() => {
    try {
      const userId = api.getCurrentUserIdFromToken();
      const raw = localStorage.getItem(`kt_clientDeleted_${userId ?? 'anon'}`);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<string>();
    }
  }, []);

  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter(task => task.attributes.due)
      .filter(task => getTaskStatus(task) !== "deleted" && !clientDeletedIds.has(task.id))
      .map(task => {
        const dueDate = new Date(task.attributes.due!);
        return {
          id: task.id,
          title: task.attributes.title,
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
          resource: task
        };
      });
  }, [tasks, clientDeletedIds]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const task = event.resource;
    const status = getTaskStatus(task);
    
    let backgroundColor = "#3174ad";
    let borderColor = "#3174ad";
    
    switch (status) {
      case "completed":
        backgroundColor = "#22c55e";
        borderColor = "#16a34a";
        break;
      case "overdue":
        backgroundColor = "#ef4444";
        borderColor = "#dc2626";
        break;
      case "pending":
        backgroundColor = "#3b82f6";
        borderColor = "#2563eb";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: "4px",
        opacity: task.attributes.completed ? 0.7 : 1,
        color: "white",
        fontSize: "12px",
        padding: "2px 4px"
      }
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const task = event.resource;
    const status = getTaskStatus(task);
    
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium truncate">{event.title}</span>
        {task.attributes.number && (
          <span className="text-xs opacity-75">#{task.attributes.number}</span>
        )}
      </div>
    );
  };

  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
          >
            Hoje
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold">{label}</h2>

        <div className="flex items-center gap-1">
          <Button
            variant={currentView === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCurrentView("day");
              onView("day");
            }}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Dia</span>
          </Button>
          
          <Button
            variant={currentView === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCurrentView("week");
              onView("week");
            }}
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Semana</span>
          </Button>
          
          <Button
            variant={currentView === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCurrentView("month");
              onView("month");
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Mês</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">Legenda:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs">Pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-xs">Atrasada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-xs">Concluída</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <div className="bg-background rounded-lg border p-4" style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => onTaskClick(event.resource)}
          components={{
            event: CustomEvent,
            toolbar: CustomToolbar
          }}
          messages={{
            today: "Hoje",
            previous: "Anterior",
            next: "Próximo",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Tarefa",
            noEventsInRange: "Não há tarefas neste período",
            showMore: (total) => `+ Ver mais (${total})`
          }}
          views={[Views.DAY, Views.WEEK, Views.MONTH]}
          step={60}
          showMultiDayTimes
        />
      </div>
    </div>
  );
}