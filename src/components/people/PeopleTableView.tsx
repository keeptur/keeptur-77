import { Person } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Edit, MoreHorizontal, Mail, Phone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
interface PeopleTableViewProps {
  people: Person[];
  onView: (person: Person) => void;
  onEdit: (person: Person) => void;
}

// Função para gerar cor do avatar baseada no nome
const getAvatarColor = (name: string) => {
  const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(220 70% 50%)", "hsl(300 70% 50%)", "hsl(30 70% 50%)", "hsl(150 70% 50%)", "hsl(260 70% 50%)", "hsl(10 70% 50%)"];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Função para obter iniciais do nome
const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};
export function PeopleTableView({
  people,
  onView,
  onEdit
}: PeopleTableViewProps) {
  return <div className="rounded-lg border border-border/50 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="w-[450px]">Cliente</TableHead>
            <TableHead className="w-[200px]">E-mail</TableHead>
            
            <TableHead className="w-[130px]">Celular</TableHead>
            <TableHead className="w-[150px]">Cidade</TableHead>
            
            <TableHead className="w-[100px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map(person => <TableRow key={person.id} className="border-border/50 hover:bg-muted/30 transition-colors">
              <TableCell className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shadow-sm">
                    <AvatarFallback className="text-white font-semibold text-sm" style={{
                  backgroundColor: getAvatarColor(person.attributes.name)
                }}>
                      {getInitials(person.attributes.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {person.attributes.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={person.attributes.kind === "individual" ? "default" : "secondary"} className="text-xs">
                        {person.attributes.kind === "individual" ? "PF" : "PJ"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{person.attributes.code}
                      </span>
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="p-4">
                <div className="flex items-center gap-2">
                  {person.attributes.email ? <>
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-foreground truncate">
                        {person.attributes.email}
                      </span>
                    </> : <span className="text-sm text-muted-foreground">-</span>}
                </div>
              </TableCell>
              
              
              
              <TableCell className="p-4">
                <div className="flex items-center gap-2">
                  {person.attributes["mobile-phone"] ? <>
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {person.attributes["mobile-phone"]}
                      </span>
                    </> : <span className="text-sm text-muted-foreground">-</span>}
                </div>
              </TableCell>
              
              <TableCell className="p-4">
                <span className="text-sm text-foreground">
                  {person.attributes.district || "-"}
                </span>
              </TableCell>
              
              
              
              <TableCell className="p-4">
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onView(person)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(person)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(person)}>
                        Visualizar
                      </DropdownMenuItem>
                      
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>;
}