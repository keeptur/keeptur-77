import { useState, useEffect } from "react";
import { User, Building2, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Person } from "@/types/api";
import { api } from "@/lib/api";

interface PersonDisplayProps {
  personId: string | null;
  showDetails?: boolean;
  compact?: boolean;
}

export function PersonDisplay({ personId, showDetails = false, compact = false }: PersonDisplayProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPerson = async () => {
      if (!personId) {
        setPerson(null);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.getPerson(personId);
        setPerson(response.data);
      } catch (error) {
        console.error("Error fetching person:", error);
        setPerson(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerson();
  }, [personId]);

  if (!personId) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="text-sm">Não atribuído</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          {showDetails && <Skeleton className="h-3 w-32" />}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="text-sm">Pessoa não encontrada</span>
      </div>
    );
  }

  const getPersonInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const formatPhone = (phone: string) => {
    // Formato básico para telefone brasileiro
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs">
            {getPersonInitials(person.attributes.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{person.attributes.name}</p>
          {person.attributes.kind === "company" && (
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Empresa
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-muted/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getPersonInitials(person.attributes.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{person.attributes.name}</h4>
              <Badge variant={person.attributes.kind === "company" ? "default" : "secondary"} className="text-xs">
                {person.attributes.kind === "company" ? (
                  <>
                    <Building2 className="h-3 w-3 mr-1" />
                    Empresa
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Pessoa
                  </>
                )}
              </Badge>
            </div>

            {person.attributes["company-name"] && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {person.attributes["company-name"]}
              </p>
            )}

            {showDetails && (
              <div className="space-y-1">
                {person.attributes.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {person.attributes.email}
                  </p>
                )}

                {(person.attributes["mobile-phone"] || person.attributes.phone) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(person.attributes["mobile-phone"] || person.attributes.phone || "")}
                  </p>
                )}

                {person.attributes.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {person.attributes.address}
                    {person.attributes.district && `, ${person.attributes.district}`}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Código: #{person.attributes.code}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}