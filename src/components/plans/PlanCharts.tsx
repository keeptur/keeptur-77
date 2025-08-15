import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const conversionData = [
  { name: "Básico", value: 45.2 },
  { name: "Pro", value: 68.5 },
  { name: "Enterprise", value: 82.3 }
];

const distributionData = [
  { name: "Básico", value: 247, color: "hsl(var(--primary))" },
  { name: "Pro", value: 684, color: "hsl(var(--success))" },
  { name: "Enterprise", value: 316, color: "hsl(var(--warning))" }
];

export default function PlanCharts() {
  const [conversionPeriod, setConversionPeriod] = useState("30d");
  const [distributionMode, setDistributionMode] = useState("users");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Conversion Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Métricas de Conversão</CardTitle>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={conversionPeriod === "30d" ? "default" : "outline"}
              onClick={() => setConversionPeriod("30d")}
            >
              30D
            </Button>
            <Button
              size="sm"
              variant={conversionPeriod === "90d" ? "default" : "outline"}
              onClick={() => setConversionPeriod("90d")}
            >
              90D
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value) => [`${value}%`, "Taxa de Conversão"]}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Distribuição por Plano</CardTitle>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={distributionMode === "users" ? "default" : "outline"}
              onClick={() => setDistributionMode("users")}
            >
              Usuários
            </Button>
            <Button
              size="sm"
              variant={distributionMode === "revenue" ? "default" : "outline"}
              onClick={() => setDistributionMode("revenue")}
            >
              Receita
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value, name) => [`${value} usuários`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}