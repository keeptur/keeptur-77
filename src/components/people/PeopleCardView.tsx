import { Person } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building, Phone, Mail, MapPin, Edit, Eye } from "lucide-react";
import { format } from "date-fns";

interface PeopleCardViewProps {
  people: Person[];
  onView: (person: Person) => void;
  onEdit: (person: Person) => void;
}

const PersonCard = ({ person, onView, onEdit }: { 
  person: Person; 
  onView: (person: Person) => void;
  onEdit: (person: Person) => void; 
}) => (
  <Card className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm" onClick={() => onView(person)}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center shadow-inner">
            {person.attributes.kind === "individual" ? (
              <Users className="h-6 w-6 text-primary" />
            ) : (
              <Building className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{person.attributes.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={person.attributes.kind === "individual" ? "default" : "secondary"}
                className="shadow-sm"
              >
                {person.attributes.kind === "individual" ? "Pessoa Física" : "Pessoa Jurídica"}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">#{person.attributes.code}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors" 
            onClick={(e) => { e.stopPropagation(); onView(person); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors" 
            onClick={(e) => { e.stopPropagation(); onEdit(person); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {person.attributes["company-name"] && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4 text-primary/60" />
            <span className="truncate">{person.attributes["company-name"]}</span>
          </div>
        )}
        
        {person.attributes.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-primary/60" />
            <span className="truncate">{person.attributes.email}</span>
          </div>
        )}
        
        {(person.attributes["mobile-phone"] || person.attributes.phone || person.attributes["business-phone"]) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-primary/60" />
            <span>
              {person.attributes["mobile-phone"] || person.attributes.phone || person.attributes["business-phone"]}
            </span>
          </div>
        )}
        
        {(person.attributes.address || person.attributes.district) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary/60" />
            <span className="truncate">
              {[person.attributes.address, person.attributes.number, person.attributes.district]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Cadastrado em {format(new Date(person.attributes["registered-at"]), "dd/MM/yyyy")}</span>
          {person.attributes["birth-date"] && (
            <span>Nascimento: {format(new Date(person.attributes["birth-date"]), "dd/MM/yyyy")}</span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function PeopleCardView({ people, onView, onEdit }: PeopleCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {people.map((person) => (
        <PersonCard 
          key={person.id} 
          person={person} 
          onView={onView}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}