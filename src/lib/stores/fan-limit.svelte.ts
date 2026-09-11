export class FanLimitState {
  isOpen = $state(false);
  message = $state('Has alcanzado el límite gratuito de 5 artistas.');
  limit = $state(5);
  price = $state(8);

  openModal(customMessage?: string, limit = 5, price = 8) {
    if (customMessage) this.message = customMessage;
    this.limit = limit;
    this.price = price;
    this.isOpen = true;
  }

  closeModal() {
    this.isOpen = false;
  }
}

export const fanLimitState = new FanLimitState();
