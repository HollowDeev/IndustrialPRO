import React, { useState, useEffect } from 'react';
import { Employee, PunctualityRecord, EmployeeQualities } from '../types';
import { 
  User, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Clock, 
  Plus, 
  Search, 
  Edit3, 
  Check, 
  X, 
  Award, 
  Trash2, 
  CheckSquare, 
  Square,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import LoadingOverlay from './LoadingOverlay';

export default function Funcionarios({ 
  externalSearchQuery,
  triggerAddNew
}: { 
  externalSearchQuery?: string;
  triggerAddNew?: number;
}) {
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (triggerAddNew !== undefined && triggerAddNew > 0) {
      handleStartAddNew();
    }
  }, [triggerAddNew]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);

  // New Employee Form State
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    id: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    civilStatus: 'Solteiro(a)',
    address: '',
    city: '',
    state: 'SP',
    zipCode: '',
    admissionDate: new Date().toISOString().substring(0, 10),
    role: '',
    hourlyWage: 20,
    workingHoursRegime: 8,
    punctualityHistory: [],
    qualities: {
      empilhadeira: false,
      laser: false,
      habilitadoDirigir: false,
      lixadeira: false,
      controleQualidade: false,
      extrusorNivel1: false,
      extrusorNivel2: false
    }
  });

  // Edit Employee Form State
  const [editForm, setEditForm] = useState<Employee | null>(null);

  // New Punctuality Record Form State
  const [newPunct, setNewPunct] = useState({
    date: new Date().toISOString().substring(0, 10),
    arrivalTime: '08:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    departureTime: '17:00'
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome');

      if (data) {
        const mapped = data.map((item: any) => ({
          ...item.metadados,
          id: item.id,
          customId: item.metadados?.customId || item.metadados?.id || 'EMP',
          firstName: item.metadados?.firstName || item.nome.split(' ')[0],
          lastName: item.metadados?.lastName || item.nome.split(' ').slice(1).join(' '),
          role: item.cargo || item.metadados?.role || 'Operador',
          ativo: item.ativo
        }));
        setEmployees(mapped);
        if (mapped.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const currentEmployee = employees.find(e => e.id === selectedEmployeeId);

  useEffect(() => {
    if (currentEmployee) {
      setEditForm({ ...currentEmployee });
    } else {
      setEditForm(null);
    }
    setIsEditing(false);
  }, [selectedEmployeeId, employees]);

  const parseTimeToHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours + (minutes / 60);
  };

  const calculateDailyHours = (p: PunctualityRecord): number => {
    const tArrival = parseTimeToHours(p.arrivalTime);
    const tLunchStart = parseTimeToHours(p.lunchStart);
    const tLunchEnd = parseTimeToHours(p.lunchEnd);
    const tDeparture = parseTimeToHours(p.departureTime);

    const morning = Math.max(0, tLunchStart - tArrival);
    const afternoon = Math.max(0, tDeparture - tLunchEnd);
    return parseFloat((morning + afternoon).toFixed(2));
  };

  const calculateDailyExtra = (p: PunctualityRecord, regime: number): number => {
    const worked = calculateDailyHours(p);
    const extra = worked - regime;
    return extra > 0 ? parseFloat(extra.toFixed(2)) : 0;
  };

  const calculateTotalHours = (history: PunctualityRecord[]): number => {
    return (history || []).reduce((acc, p) => acc + calculateDailyHours(p), 0);
  };

  const calculateTotalExtraHours = (history: PunctualityRecord[], regime: number): number => {
    return (history || []).reduce((acc, p) => acc + calculateDailyExtra(p, regime), 0);
  };

  const calculateMonthlySalary = (employee: Employee): number => {
    const hours = calculateTotalHours(employee.punctualityHistory);
    return parseFloat((hours * employee.hourlyWage).toFixed(2));
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m > 0 ? `${m}m` : '00m'}`;
  };

  const formatCEP = (value: string) => {
    let val = value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    if (val.length > 5) val = val.substring(0, 5) + '-' + val.substring(5);
    return val;
  };

  const filteredEmployees = employees.filter(e => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const query = (externalSearchQuery || searchTerm || '').toLowerCase();
    return fullName.includes(query) || e.role.toLowerCase().includes(query) || (e.customId || '').toLowerCase().includes(query);
  });

  const handleStartAddNew = () => {
    const nextCodeNum = employees.length + 1;
    const autoCode = `EMP-${nextCodeNum.toString().padStart(3, '0')}`;
    setNewEmp({
      id: autoCode,
      firstName: '',
      lastName: '',
      birthDate: '1990-01-01',
      civilStatus: 'Solteiro(a)',
      address: '',
      city: '',
      state: 'SP',
      zipCode: '',
      admissionDate: new Date().toISOString().substring(0, 10),
      role: '',
      hourlyWage: 25,
      workingHoursRegime: 8,
      punctualityHistory: [],
      qualities: {
        empilhadeira: false,
        laser: false,
        habilitadoDirigir: false,
        lixadeira: false,
        controleQualidade: false,
        extrusorNivel1: false,
        extrusorNivel2: false
      }
    });
    setIsAddingNew(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.id || !newEmp.firstName || !newEmp.lastName || !newEmp.role) {
      addToast('Por favor, preencha o Código, Nome, Sobrenome e Função.', 'warning');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    const empresaId = profile?.empresa_id;
    if (!empresaId) return;

    const metadataObj = {
      customId: newEmp.id,
      firstName: newEmp.firstName,
      lastName: newEmp.lastName,
      birthDate: newEmp.birthDate || '',
      civilStatus: newEmp.civilStatus || 'Solteiro(a)',
      address: newEmp.address || '',
      city: newEmp.city || '',
      state: newEmp.state || 'SP',
      zipCode: newEmp.zipCode || '',
      admissionDate: newEmp.admissionDate || '',
      role: newEmp.role,
      hourlyWage: Number(newEmp.hourlyWage) || 20,
      workingHoursRegime: Number(newEmp.workingHoursRegime) || 8,
      punctualityHistory: [],
      qualities: newEmp.qualities
    };

    const { error } = await supabase.from('funcionarios').insert({
      empresa_id: empresaId,
      nome: `${newEmp.firstName} ${newEmp.lastName}`,
      cargo: newEmp.role,
      ativo: true,
      metadados: metadataObj
    });

    if (error) {
      addToast(`Erro ao criar funcionário: ${error.message}`, 'error');
    } else {
      setIsAddingNew(false);
      await fetchEmployees();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editForm.firstName || !editForm.lastName || !editForm.role) {
      addToast('Por favor, preencha Nome, Sobrenome e Função.', 'warning');
      return;
    }

    const metadataObj = {
      customId: editForm.customId || editForm.id,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      birthDate: editForm.birthDate || '',
      civilStatus: editForm.civilStatus || 'Solteiro(a)',
      address: editForm.address || '',
      city: editForm.city || '',
      state: editForm.state || 'SP',
      zipCode: editForm.zipCode || '',
      admissionDate: editForm.admissionDate || '',
      role: editForm.role,
      hourlyWage: Number(editForm.hourlyWage) || 20,
      workingHoursRegime: Number(editForm.workingHoursRegime) || 8,
      punctualityHistory: editForm.punctualityHistory || [],
      qualities: editForm.qualities
    };

    const { error } = await supabase
      .from('funcionarios')
      .update({
        nome: `${editForm.firstName} ${editForm.lastName}`,
        cargo: editForm.role,
        metadados: metadataObj
      })
      .eq('id', editForm.id);

    if (error) {
      addToast(`Erro ao atualizar funcionário: ${error.message}`, 'error');
    } else {
      setIsEditing(false);
      await fetchEmployees();
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Deseja realmente excluir este funcionário?')) {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) {
        addToast(`Erro ao excluir: ${error.message}`, 'error');
      } else {
        await fetchEmployees();
      }
    }
  };

  const handleAddPunctualityRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    const record: PunctualityRecord = {
      id: `p-${Date.now()}`,
      date: newPunct.date.split('-').reverse().join('/'),
      arrivalTime: newPunct.arrivalTime,
      lunchStart: newPunct.lunchStart,
      lunchEnd: newPunct.lunchEnd,
      departureTime: newPunct.departureTime
    };

    const updatedHistory = [...(currentEmployee.punctualityHistory || []), record];
    
    updatedHistory.sort((a,b) => {
      const parseDateStr = (str: string) => {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      };
      return parseDateStr(b.date) - parseDateStr(a.date);
    });

    const metadataObj = {
      ...currentEmployee,
      punctualityHistory: updatedHistory
    };

    const { error } = await supabase
      .from('funcionarios')
      .update({
        metadados: metadataObj
      })
      .eq('id', currentEmployee.id);

    if (error) {
      addToast(`Erro ao salvar ponto: ${error.message}`, 'error');
    } else {
      await fetchEmployees();
      setNewPunct(prev => ({
        ...prev,
        arrivalTime: '08:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        departureTime: '17:00'
      }));
    }
  };

  const handleDeletePunctualityRecord = async (recordId: string) => {
    if (!currentEmployee) return;

    if (confirm('Remover este registro de ponto?')) {
      const updatedHistory = (currentEmployee.punctualityHistory || []).filter(r => r.id !== recordId);
      
      const metadataObj = {
        ...currentEmployee,
        punctualityHistory: updatedHistory
      };

      const { error } = await supabase
        .from('funcionarios')
        .update({
          metadados: metadataObj
        })
        .eq('id', currentEmployee.id);

      if (error) {
        addToast(`Erro ao remover ponto: ${error.message}`, 'error');
      } else {
        await fetchEmployees();
      }
    }
  };

  const handleToggleQuality = async (qualityKey: keyof EmployeeQualities) => {
    if (isAddingNew) {
      setNewEmp(prev => ({
        ...prev,
        qualities: {
          ...prev.qualities!,
          [qualityKey]: !prev.qualities![qualityKey]
        }
      }));
    } else if (isEditing && editForm) {
      setEditForm({
        ...editForm,
        qualities: {
          ...editForm.qualities,
          [qualityKey]: !editForm.qualities[qualityKey]
        }
      });
    } else if (currentEmployee) {
      const updatedQualities = {
        ...currentEmployee.qualities,
        [qualityKey]: !currentEmployee.qualities[qualityKey]
      };

      const metadataObj = {
        ...currentEmployee,
        qualities: updatedQualities
      };

      const { error } = await supabase
        .from('funcionarios')
        .update({
          metadados: metadataObj
        })
        .eq('id', currentEmployee.id);

      if (error) {
        addToast(`Erro ao atualizar qualidades: ${error.message}`, 'error');
      } else {
        await fetchEmployees();
      }
    }
  };

  const QUALITY_LABELS: { key: keyof EmployeeQualities; label: string }[] = [
    { key: 'empilhadeira', label: 'Operação de Empilhadeira' },
    { key: 'laser', label: 'Operação de Laser' },
    { key: 'habilitadoDirigir', label: 'Habilitado para dirigir' },
    { key: 'lixadeira', label: 'Operação de Lixadeira' },
    { key: 'controleQualidade', label: 'Controle de Qualidade de Matéria Prima' },
    { key: 'extrusorNivel1', label: 'Extrusor Nível 1' },
    { key: 'extrusorNivel2', label: 'Extrusor Nível 2' }
  ];

  if (loading) {
    return <LoadingOverlay message="Carregando Quadro de Colaboradores..." />;
  }

  return (
    <div className="space-y-6" id="funcionarios-screen-container">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-5">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight">CADASTRO E GESTÃO DE FUNCIONÁRIOS</h2>
          <p className="text-xs text-outline">Gerenciamento completo de informações pessoais, regime de horas, ponto e qualidades operacionais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: List of Employees */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/60">
            <Search size={16} className="text-outline" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-none w-full text-primary"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredEmployees.length === 0 ? (
              <p className="text-xs text-center text-outline py-8">Nenhum funcionário encontrado.</p>
            ) : (
              filteredEmployees.map(emp => {
                const activeQualitiesCount = Object.values(emp.qualities).filter(Boolean).length;
                const isSelected = emp.id === selectedEmployeeId && !isAddingNew;

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployeeId(emp.id);
                      setIsAddingNew(false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-container/25 border-primary text-primary font-medium'
                        : 'bg-surface-bright hover:bg-surface-container-low border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-primary text-white' : 'bg-surface-container-high text-primary'
                      }`}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                        </div>
                        <p className="text-[10px] text-outline line-clamp-1">{emp.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] bg-secondary-container/35 text-on-secondary-container px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Award size={10} />
                        {activeQualitiesCount}
                      </span>
                      <ChevronRight size={14} className="text-outline" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Employee View & Edit or New Form */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAddingNew ? (
            /* ================= ADD NEW EMPLOYEE FORM ================= */
            <form onSubmit={handleCreateEmployee} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <UserPlus size={20} className="text-secondary" />
                  <div>
                    <h3 className="text-base font-bold">Novo Cadastro de Funcionário</h3>
                    <p className="text-xs text-outline">Preencha os dados dos blocos operacionais para criar a ficha cadastral.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="p-2 hover:bg-surface-container rounded-full text-outline hover:text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* FIRST BLOCK: Dados Pessoais */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1">
                  <span>1. Dados Pessoais</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Código (ID)</label>
                    <input
                      type="text"
                      required
                      value={newEmp.id}
                      onChange={(e) => setNewEmp({ ...newEmp, id: e.target.value.toUpperCase() })}
                      placeholder="Ex: EMP-004"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Nome</label>
                    <input
                      type="text"
                      required
                      value={newEmp.firstName}
                      onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                      placeholder="Ex: Roberto"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Sobrenome</label>
                    <input
                      type="text"
                      required
                      value={newEmp.lastName}
                      onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                      placeholder="Ex: Santos"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={newEmp.birthDate}
                      onChange={(e) => setNewEmp({ ...newEmp, birthDate: e.target.value })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Estado Civil</label>
                    <select
                      value={newEmp.civilStatus}
                      onChange={(e) => setNewEmp({ ...newEmp, civilStatus: e.target.value })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">CEP</label>
                    <input
                      type="text"
                      value={newEmp.zipCode}
                      onChange={(e) => setNewEmp({ ...newEmp, zipCode: formatCEP(e.target.value) })}
                      placeholder="Ex: 09750-000"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Endereço</label>
                    <input
                      type="text"
                      value={newEmp.address}
                      onChange={(e) => setNewEmp({ ...newEmp, address: e.target.value })}
                      placeholder="Ex: Av. Industrial, 1200"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Cidade</label>
                    <input
                      type="text"
                      value={newEmp.city}
                      onChange={(e) => setNewEmp({ ...newEmp, city: e.target.value })}
                      placeholder="Ex: São Paulo"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Estado</label>
                    <input
                      type="text"
                      value={newEmp.state}
                      maxLength={2}
                      onChange={(e) => setNewEmp({ ...newEmp, state: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* SECOND BLOCK: Dados Contratuais */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/60">
                <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1">
                  <span>2. Dados Contratuais</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Data de Admissão</label>
                    <input
                      type="date"
                      value={newEmp.admissionDate}
                      onChange={(e) => setNewEmp({ ...newEmp, admissionDate: e.target.value })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Função / Cargo</label>
                    <input
                      type="text"
                      required
                      value={newEmp.role}
                      onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                      placeholder="Ex: Auxiliar Técnico"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Salário Hora (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newEmp.hourlyWage}
                      onChange={(e) => setNewEmp({ ...newEmp, hourlyWage: Number(e.target.value) })}
                      placeholder="R$ 25,00"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Regime de Horas (Dia)</label>
                    <input
                      type="number"
                      value={newEmp.workingHoursRegime}
                      onChange={(e) => setNewEmp({ ...newEmp, workingHoursRegime: Number(e.target.value) })}
                      placeholder="8"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>


              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/95 text-white font-bold py-2.5 px-5 rounded-xl text-xs tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  GRAVAR CADASTRO
                </button>
              </div>
            </form>
          ) : currentEmployee ? (
            /* ================= VIEW / EDIT PROFILE VIEW ================= */
            <div className="space-y-6">
              
              {/* Employee Top Profile Card */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-black shadow-inner">
                    {currentEmployee.firstName[0]}{currentEmployee.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-primary">{currentEmployee.firstName} {currentEmployee.lastName}</h3>
                    </div>
                    <p className="text-xs text-outline font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase size={12} className="text-secondary" />
                      {currentEmployee.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (editForm) {
                        setIsEditing(!isEditing);
                      }
                    }}
                    className={`flex items-center gap-1.5 font-bold py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isEditing 
                        ? 'bg-primary border-primary text-white hover:brightness-110' 
                        : 'bg-surface-bright border-outline-variant/80 text-primary hover:bg-surface-container-low'
                    }`}
                  >
                    {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                    {isEditing ? 'Visualizar' : 'Editar Ficha'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteEmployee(currentEmployee.id)}
                    className="p-2 bg-error-container/20 hover:bg-error-container text-on-error-container rounded-xl transition-colors cursor-pointer"
                    title="Excluir Funcionário"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Main Content Fields: Block 1 & 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* FIRST BLOCK: Dados Pessoais */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-surface-container pb-2">
                    <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-secondary" />
                      <span>Bloco 1: Dados Pessoais</span>
                    </h4>
                  </div>

                  {isEditing && editForm ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Nome</label>
                          <input
                            type="text"
                            required
                            value={editForm.firstName}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Sobrenome</label>
                          <input
                            type="text"
                            required
                            value={editForm.lastName}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Nascimento</label>
                          <input
                            type="date"
                            value={editForm.birthDate}
                            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Estado Civil</label>
                          <select
                            value={editForm.civilStatus}
                            onChange={(e) => setEditForm({ ...editForm, civilStatus: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          >
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Endereço</label>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Cidade</label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Estado</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">CEP</label>
                        <input
                          type="text"
                          value={editForm.zipCode}
                          onChange={(e) => setEditForm({ ...editForm, zipCode: formatCEP(e.target.value) })}
                          className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...currentEmployee });
                            setIsEditing(false);
                          }}
                          className="px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-secondary text-white rounded-lg text-[11px] font-bold"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Nome Completo</span>
                          <span className="font-semibold text-primary">{currentEmployee.firstName} {currentEmployee.lastName}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Nascimento</span>
                          <span className="font-semibold text-primary">
                            {currentEmployee.birthDate ? currentEmployee.birthDate.split('-').reverse().join('/') : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Estado Civil</span>
                          <span className="font-semibold text-primary">{currentEmployee.civilStatus}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">CEP</span>
                          <span className="font-semibold text-primary">{currentEmployee.zipCode || 'Não informado'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-outline uppercase text-left">Endereço de Residência</span>
                        <p className="font-semibold text-primary leading-tight text-left">
                          {currentEmployee.address ? `${currentEmployee.address}, ${currentEmployee.city} - ${currentEmployee.state}` : 'Endereço não cadastrado'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECOND BLOCK: Dados Contratuais & Salário Mês */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-surface-container pb-2">
                    <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={14} className="text-secondary" />
                      <span>Bloco 2: Dados Contratuais</span>
                    </h4>
                  </div>

                  {isEditing && editForm ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Função</label>
                        <input
                          type="text"
                          required
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Admissão</label>
                          <input
                            type="date"
                            value={editForm.admissionDate}
                            onChange={(e) => setEditForm({ ...editForm, admissionDate: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Regime (h/dia)</label>
                          <input
                            type="number"
                            value={editForm.workingHoursRegime}
                            onChange={(e) => setEditForm({ ...editForm, workingHoursRegime: Number(e.target.value) })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Salário Hora (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.hourlyWage}
                          onChange={(e) => setEditForm({ ...editForm, hourlyWage: Number(e.target.value) })}
                          className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...currentEmployee });
                            setIsEditing(false);
                          }}
                          className="px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-secondary text-white rounded-lg text-[11px] font-bold"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Data de Admissão</span>
                          <span className="font-semibold text-primary">
                            {currentEmployee.admissionDate ? currentEmployee.admissionDate.split('-').reverse().join('/') : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Regime Diário</span>
                          <span className="font-semibold text-primary">{currentEmployee.workingHoursRegime} horas por dia</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Salário por Hora</span>
                          <span className="font-mono font-bold text-primary">R$ {currentEmployee.hourlyWage.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase">Total de Horas no Mês</span>
                          <span className="font-mono font-bold text-primary flex items-center gap-1">
                            <Clock size={11} className="text-secondary" />
                            {formatHours(calculateTotalHours(currentEmployee.punctualityHistory))}
                          </span>
                        </div>
                      </div>

                      {/* CALCULATED DYNAMIC FIELD: Salário Mês */}
                      <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60 flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] font-bold text-secondary uppercase">Salário Mês (Calculado)</span>
                          <p className="text-[10px] text-outline leading-tight mt-0.5">Soma das horas trabalhadas × Salário Hora</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-extrabold text-primary">
                            R$ {calculateMonthlySalary(currentEmployee).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <p className="text-[9px] font-mono text-outline mt-0.5">
                            {calculateTotalHours(currentEmployee.punctualityHistory).toFixed(2)}h × R$ {currentEmployee.hourlyWage.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>


              {/* THIRD BLOCK: Histórico de Pontualidade */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container pb-2.5">
                  <div>
                    <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-secondary" />
                      <span>Bloco 3: Histórico de Pontualidade</span>
                    </h4>
                    <p className="text-[10px] text-outline">Lançamento diário das horas cumpridas e cálculo automático de horas extras.</p>
                  </div>
                  
                  <div className="bg-surface-container px-3 py-1 rounded-lg text-[10px] font-bold text-primary self-start">
                    Mês: {formatHours(calculateTotalHours(currentEmployee.punctualityHistory))} Trab. | Extra: {formatHours(calculateTotalExtraHours(currentEmployee.punctualityHistory, currentEmployee.workingHoursRegime))}
                  </div>
                </div>

                {/* Inline Add Record Form */}
                <form onSubmit={handleAddPunctualityRecord} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/60 space-y-3">
                  <div className="text-[10px] font-black text-primary uppercase tracking-wider">Lançar Novo Ponto Diário</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[9px] font-semibold text-outline uppercase mb-0.5">Dia</label>
                      <input
                        type="date"
                        required
                        value={newPunct.date}
                        onChange={(e) => setNewPunct({ ...newPunct, date: e.target.value })}
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-md p-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-outline uppercase mb-0.5">Hora Chegada</label>
                      <input
                        type="time"
                        required
                        value={newPunct.arrivalTime}
                        onChange={(e) => setNewPunct({ ...newPunct, arrivalTime: e.target.value })}
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-md p-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-outline uppercase mb-0.5">Pausa Almoço</label>
                      <input
                        type="time"
                        required
                        value={newPunct.lunchStart}
                        onChange={(e) => setNewPunct({ ...newPunct, lunchStart: e.target.value })}
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-md p-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-outline uppercase mb-0.5">Retorno Almoço</label>
                      <input
                        type="time"
                        required
                        value={newPunct.lunchEnd}
                        onChange={(e) => setNewPunct({ ...newPunct, lunchEnd: e.target.value })}
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-md p-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-outline uppercase mb-0.5">Hora Saída</label>
                      <input
                        type="time"
                        required
                        value={newPunct.departureTime}
                        onChange={(e) => setNewPunct({ ...newPunct, departureTime: e.target.value })}
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-md p-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="flex items-center gap-1 bg-secondary text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg cursor-pointer hover:bg-secondary/90 transition-colors"
                    >
                      <Plus size={12} />
                      ADICIONAR AO HISTÓRICO
                    </button>
                  </div>
                </form>

                {/* Punctuality Table */}
                <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
                  <table className="w-full border-collapse text-left text-xs bg-surface-bright">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant/70 text-outline text-[10px] font-black uppercase">
                        <th className="p-3">Dia</th>
                        <th className="p-3">Hora Chegada</th>
                        <th className="p-3">Parada Almoço</th>
                        <th className="p-3">Retorno Almoço</th>
                        <th className="p-3">Hora Saída</th>
                        <th className="p-3 text-center">Horas Trab.</th>
                        <th className="p-3 text-center">H. Extras ({currentEmployee.workingHoursRegime}h regime)</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 text-primary">
                      {currentEmployee.punctualityHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-outline italic">Sem registros históricos cadastrados para este funcionário.</td>
                        </tr>
                      ) : (
                        currentEmployee.punctualityHistory.map((p) => {
                          const worked = calculateDailyHours(p);
                          const extra = calculateDailyExtra(p, currentEmployee.workingHoursRegime);
                          return (
                            <tr key={p.id} className="hover:bg-surface-container-low/50">
                              <td className="p-3 font-semibold">{p.date}</td>
                              <td className="p-3 font-mono">{p.arrivalTime}</td>
                              <td className="p-3 font-mono text-outline">{p.lunchStart}</td>
                              <td className="p-3 font-mono text-outline">{p.lunchEnd}</td>
                              <td className="p-3 font-mono">{p.departureTime}</td>
                              <td className="p-3 text-center font-mono font-medium">{worked.toFixed(2)}h</td>
                              <td className="p-3 text-center">
                                {extra > 0 ? (
                                  <span className="font-mono bg-tertiary-fixed text-on-tertiary-fixed font-bold px-2 py-0.5 rounded text-[10px]">
                                    +{extra.toFixed(2)}h extra
                                  </span>
                                ) : (
                                  <span className="font-mono text-outline text-[10px]">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePunctualityRecord(p.id)}
                                  className="text-error hover:text-error/85 hover:bg-error-container/20 p-1.5 rounded-lg transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>



            </div>
          ) : (
            <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant shadow-xs text-center space-y-3">
              <User className="text-outline mx-auto animate-bounce" size={40} />
              <h3 className="text-sm font-bold text-primary">Nenhum Funcionário Cadastrado</h3>
              <p className="text-xs text-outline max-w-sm mx-auto">Comece adicionando seu primeiro funcionário industrial no botão acima para monitorar presença, regime e qualidades.</p>
              <button
                onClick={handleStartAddNew}
                className="mt-2 bg-secondary text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer hover:bg-secondary/90 transition-all"
              >
                + Cadastrar Primeiro Funcionário
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
