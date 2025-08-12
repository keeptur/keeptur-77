import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Save, 
  X, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Globe,
  FileText
} from "lucide-react";
import { Person, CreatePersonData, UpdatePersonData } from "@/types/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompactPersonModalProps {
  person: Person | null;
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  onClose: () => void;
  onSave: (data: CreatePersonData | UpdatePersonData) => Promise<void>;
}

export function CompactPersonModal({ person, isOpen, mode, onClose, onSave }: CompactPersonModalProps) {
  const [isEditing, setIsEditing] = useState(mode === "create" || mode === "edit");
  const [formData, setFormData] = useState({
    name: "",
    "company-name": "",
    kind: "individual" as "individual" | "company",
    email: "",
    phone: "",
    "mobile-phone": "",
    "business-phone": "",
    address: "",
    number: "",
    complement: "",
    district: "",
    zip: "",
    "birth-date": "",
    cpf: "",
    rg: "",
    cnpj: "",
    "passport-number": "",
    "passport-expiration": "",
    gender: "",
    "city-inscription": "",
    "state-inscription": "",
    observations: "",
    website: ""
  });

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.attributes.name || "",
        "company-name": person.attributes["company-name"] || "",
        kind: person.attributes.kind || "individual",
        email: person.attributes.email || "",
        phone: person.attributes.phone || "",
        "mobile-phone": person.attributes["mobile-phone"] || "",
        "business-phone": person.attributes["business-phone"] || "",
        address: person.attributes.address || "",
        number: person.attributes.number || "",
        complement: person.attributes.complement || "",
        district: person.attributes.district || "",
        zip: person.attributes.zip || "",
        "birth-date": person.attributes["birth-date"] ? format(new Date(person.attributes["birth-date"]), "yyyy-MM-dd") : "",
        cpf: person.attributes.cpf || "",
        rg: person.attributes.rg || "",
        cnpj: person.attributes.cnpj || "",
        "passport-number": person.attributes["passport-number"] || "",
        "passport-expiration": person.attributes["passport-expiration"] ? format(new Date(person.attributes["passport-expiration"]), "yyyy-MM-dd") : "",
        gender: person.attributes.gender || "",
        "city-inscription": person.attributes["city-inscription"] || "",
        "state-inscription": person.attributes["state-inscription"] || "",
        observations: person.attributes.observations || "",
        website: person.attributes.website || ""
      });
      setIsEditing(mode === "edit");
    } else if (mode === "create") {
      setFormData({
        name: "",
        "company-name": "",
        kind: "individual",
        email: "",
        phone: "",
        "mobile-phone": "",
        "business-phone": "",
        address: "",
        number: "",
        complement: "",
        district: "",
        zip: "",
        "birth-date": "",
        cpf: "",
        rg: "",
        cnpj: "",
        "passport-number": "",
        "passport-expiration": "",
        gender: "",
        "city-inscription": "",
        "state-inscription": "",
        observations: "",
        website: ""
      });
      setIsEditing(true);
    }
  }, [person, mode]);

  const handleSave = async () => {
    const cleanedData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== "")
    );

    if (mode === "create") {
      await onSave({
        type: "people",
        attributes: cleanedData
      } as CreatePersonData);
    } else {
      await onSave({
        type: "people",
        attributes: cleanedData
      } as UpdatePersonData);
    }
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTitle = () => {
    if (mode === "create") return "Nova Pessoa";
    if (mode === "edit") return "Editar Pessoa";
    return "Visualizar Pessoa";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        {/* Header fixo */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {formData.kind === "individual" ? (
                <User className="h-5 w-5" />
              ) : (
                <Building className="h-5 w-5" />
              )}
              {getTitle()}
              {person && (
                <Badge variant="secondary">#{person.attributes.code}</Badge>
              )}
            </span>
            {mode === "view" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <ScrollArea className="flex-1 px-6">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kind">Tipo</Label>
                      {isEditing ? (
                        <Select
                          value={formData.kind}
                          onValueChange={(value) => handleInputChange("kind", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Pessoa Física</SelectItem>
                            <SelectItem value="company">Pessoa Jurídica</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm py-2">
                          {formData.kind === "individual" ? "Pessoa Física" : "Pessoa Jurídica"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome {formData.kind === "company" ? "da Empresa" : "Completo"}</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder={formData.kind === "company" ? "Nome da empresa" : "Nome completo"}
                        required
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.name}</p>
                    )}
                  </div>

                  {formData.kind === "company" && (
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome Fantasia</Label>
                      {isEditing ? (
                        <Input
                          id="company-name"
                          value={formData["company-name"]}
                          onChange={(e) => handleInputChange("company-name", e.target.value)}
                          placeholder="Nome fantasia da empresa"
                        />
                      ) : (
                        <p className="text-sm py-2">{formData["company-name"] || "Não informado"}</p>
                      )}
                    </div>
                  )}

                  {formData.kind === "individual" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birth-date">Data de Nascimento</Label>
                        {isEditing ? (
                          <Input
                            id="birth-date"
                            type="date"
                            value={formData["birth-date"]}
                            onChange={(e) => handleInputChange("birth-date", e.target.value)}
                          />
                        ) : (
                          <p className="text-sm py-2">
                            {formData["birth-date"] ? format(new Date(formData["birth-date"]), "dd/MM/yyyy", { locale: ptBR }) : "Não informado"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Gênero</Label>
                        {isEditing ? (
                          <Select
                            value={formData.gender}
                            onValueChange={(value) => handleInputChange("gender", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gênero" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Masculino</SelectItem>
                              <SelectItem value="female">Feminino</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm py-2">
                            {formData.gender === "male" ? "Masculino" : 
                             formData.gender === "female" ? "Feminino" : 
                             formData.gender === "other" ? "Outro" : "Não informado"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Informações de Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.email || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        placeholder="https://exemplo.com"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.website || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="(11) 1234-5678"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.phone || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile-phone">Celular</Label>
                    {isEditing ? (
                      <Input
                        id="mobile-phone"
                        value={formData["mobile-phone"]}
                        onChange={(e) => handleInputChange("mobile-phone", e.target.value)}
                        placeholder="(11) 91234-5678"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData["mobile-phone"] || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Telefone Comercial</Label>
                    {isEditing ? (
                      <Input
                        id="business-phone"
                        value={formData["business-phone"]}
                        onChange={(e) => handleInputChange("business-phone", e.target.value)}
                        placeholder="(11) 1234-5678"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData["business-phone"] || "Não informado"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.kind === "individual" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        {isEditing ? (
                          <Input
                            id="cpf"
                            value={formData.cpf}
                            onChange={(e) => handleInputChange("cpf", e.target.value)}
                            placeholder="000.000.000-00"
                          />
                        ) : (
                          <p className="text-sm py-2">{formData.cpf || "Não informado"}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rg">RG</Label>
                        {isEditing ? (
                          <Input
                            id="rg"
                            value={formData.rg}
                            onChange={(e) => handleInputChange("rg", e.target.value)}
                            placeholder="00.000.000-0"
                          />
                        ) : (
                          <p className="text-sm py-2">{formData.rg || "Não informado"}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        {isEditing ? (
                          <Input
                            id="cnpj"
                            value={formData.cnpj}
                            onChange={(e) => handleInputChange("cnpj", e.target.value)}
                            placeholder="00.000.000/0000-00"
                          />
                        ) : (
                          <p className="text-sm py-2">{formData.cnpj || "Não informado"}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state-inscription">Inscrição Estadual</Label>
                        {isEditing ? (
                          <Input
                            id="state-inscription"
                            value={formData["state-inscription"]}
                            onChange={(e) => handleInputChange("state-inscription", e.target.value)}
                          />
                        ) : (
                          <p className="text-sm py-2">{formData["state-inscription"] || "Não informado"}</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    {isEditing ? (
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        placeholder="Rua, Avenida..."
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.address || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    {isEditing ? (
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => handleInputChange("number", e.target.value)}
                        placeholder="123"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.number || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    {isEditing ? (
                      <Input
                        id="complement"
                        value={formData.complement}
                        onChange={(e) => handleInputChange("complement", e.target.value)}
                        placeholder="Apto, Casa, etc."
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.complement || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Bairro</Label>
                    {isEditing ? (
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => handleInputChange("district", e.target.value)}
                        placeholder="Nome do bairro"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.district || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">CEP</Label>
                    {isEditing ? (
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => handleInputChange("zip", e.target.value)}
                        placeholder="00000-000"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.zip || "Não informado"}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="observations">Observações</Label>
                    {isEditing ? (
                      <Textarea
                        id="observations"
                        value={formData.observations}
                        onChange={(e) => handleInputChange("observations", e.target.value)}
                        placeholder="Observações gerais..."
                        className="min-h-[80px]"
                      />
                    ) : (
                      <p className="text-sm py-2">{formData.observations || "Não informado"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer fixo com botões */}
        <div className="p-6 pt-0 flex-shrink-0 border-t bg-background/95 backdrop-blur-sm">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              {isEditing ? "Cancelar" : "Fechar"}
            </Button>
            {isEditing && (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}