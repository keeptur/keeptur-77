
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  full_name: z.string().min(2, "Informe seu nome completo").max(120),
  email: z.string().email("Email inválido"),
  avatar_url: z.string().url("URL inválida").or(z.literal("")).optional(),
  phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  birth_date: z.string().optional(), // yyyy-mm-dd
});

type FormValues = z.infer<typeof schema>;

export default function AdminProfileForm() {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      avatar_url: "",
      phone: "",
      mobile_phone: "",
      birth_date: "",
    },
  });

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const id = user?.id || null;
      setUid(id);

      if (!id) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url, phone, mobile_phone, birth_date")
        .eq("id", id)
        .maybeSingle();

      if (mounted && profile) {
        form.reset({
          full_name: profile.full_name || "",
          email: profile.email || "",
          avatar_url: profile.avatar_url || "",
          phone: profile.phone || "",
          mobile_phone: profile.mobile_phone || "",
          birth_date: profile.birth_date || "",
        });
      }
      mounted && setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    if (!uid) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        email: values.email,
        avatar_url: values.avatar_url || null,
        phone: values.phone || null,
        mobile_phone: values.mobile_phone || null,
        birth_date: values.birth_date || null,
      })
      .eq("id", uid);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil (Admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const nameForInitials = form.watch("full_name") || form.watch("email") || "";
  const initials = nameForInitials
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil (Admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={form.watch("avatar_url") || ""} alt={form.watch("full_name")} />
            <AvatarFallback className="text-lg">{initials || "A"}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            Atualize suas informações de contato e avatar.
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormDescription>Este email aparece no seu perfil.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 0000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobile_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>Informe a URL de uma imagem.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
