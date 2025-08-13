import { useState, useEffect } from "react";
import { User, Mail, Phone, Building2, Calendar, Badge as BadgeIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfileProps {
  userId?: string | null;
  showFullProfile?: boolean;
}

export function UserProfile({ userId, showFullProfile = false }: UserProfileProps) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        // Obter usuário atual do Supabase
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = userId || user?.id;

        if (!currentUserId) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar perfil na tabela profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUserId)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar perfil:', error);
          throw error;
        }

        if (profile) {
          // Buscar se é admin
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUserId);

          const isAdmin = roles?.some(r => r.role === 'admin') || false;

          // Formatar data para compatibilidade
          setUserProfile({
            id: profile.id,
            type: "users",
            attributes: {
              name: profile.full_name || profile.email,
              email: profile.email,
              role: isAdmin ? 'Admin' : 'Usuário',
              phone: profile.phone,
              "mobile-phone": profile.mobile_phone,
              "birth-date": profile.birth_date,
              avatar: profile.avatar_url,
              "last-login": new Date().toISOString(),
              "created-at": profile.created_at,
            }
          });
        } else {
          throw new Error('Perfil não encontrado');
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        {showFullProfile && (
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Perfil não encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={userProfile.attributes.avatar} alt={userProfile.attributes.name} />
            <AvatarFallback className="text-lg">
              {getInitials(userProfile.attributes.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <CardTitle className="text-lg">{userProfile.attributes.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {userProfile.attributes.role && (
                <Badge variant="secondary" className="text-xs">
                  <BadgeIcon className="h-3 w-3 mr-1" />
                  {userProfile.attributes.role}
                </Badge>
              )}
              {userProfile.attributes.kind === "company" && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Empresa
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {showFullProfile && (
        <CardContent className="space-y-4">
          <Separator />
          
          <div className="grid gap-3">
            {userProfile.attributes.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{userProfile.attributes.email}</span>
              </div>
            )}

            {(userProfile.attributes["mobile-phone"] || userProfile.attributes.phone) && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Telefone:</span>
                <span>{userProfile.attributes["mobile-phone"] || userProfile.attributes.phone}</span>
              </div>
            )}

            {userProfile.attributes["company-name"] && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Empresa:</span>
                <span>{userProfile.attributes["company-name"]}</span>
              </div>
            )}

            {userProfile.attributes["last-login"] && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Último acesso:</span>
                <span>{formatDate(userProfile.attributes["last-login"])}</span>
              </div>
            )}

            {userProfile.attributes["created-at"] && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Membro desde:</span>
                <span>{formatDate(userProfile.attributes["created-at"])}</span>
              </div>
            )}

            {userProfile.attributes.code && (
              <div className="flex items-center gap-2 text-sm">
                <BadgeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Código:</span>
                <span>#{userProfile.attributes.code}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}