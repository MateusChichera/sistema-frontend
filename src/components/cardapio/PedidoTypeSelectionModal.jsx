// frontend/src/components/cardapio/PedidoTypeSelectionModal.jsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Bike, Home } from 'lucide-react';
import { toast } from 'sonner';

const PedidoTypeSelectionModal = ({ onSelectType, onClose, empresa }) => {
  const [selectedType, setSelectedType] = useState(null);

  const handleConfirm = () => {
    if (selectedType) {
      // Validações adicionais baseadas nas configurações da empresa
      if (selectedType === 'Delivery' && empresa.desativar_entrega) {
        toast.error('Opção de Delivery desativada para esta empresa.');
        return;
      }
      if (selectedType === 'Retirada' && empresa.desativar_retirada) {
        toast.error('Opção de Retirada desativada para esta empresa.');
        return;
      }
      onSelectType(selectedType);
    } else {
      toast.error('Por favor, selecione o tipo de pedido.');
    }
  };

  return (
    <div className="p-4">
      <DialogHeader>
        <DialogTitle>Como deseja seu pedido?</DialogTitle>
        <DialogDescription>
          Escolha se deseja receber em casa ou retirar no local.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col space-y-4 my-6">
        <Button 
          variant={selectedType === 'Delivery' ? 'default' : 'outline'}
          onClick={() => setSelectedType('Delivery')}
          disabled={empresa.desativar_entrega}
          className={`h-auto py-4 text-lg ${empresa.desativar_entrega ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Bike className="mr-3 h-6 w-6" /> Entrega (Delivery)
        </Button>
        <Button 
          variant={selectedType === 'Retirada' ? 'default' : 'outline'}
          onClick={() => setSelectedType('Retirada')}
          disabled={empresa.desativar_retirada}
          className={`h-auto py-4 text-lg ${empresa.desativar_retirada ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Home className="mr-3 h-6 w-6" /> Retirada no Local
        </Button>
      </div>

      <DialogFooter>
        <Button onClick={handleConfirm} disabled={!selectedType}>Continuar</Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </DialogFooter>
    </div>
  );
};

export default PedidoTypeSelectionModal;