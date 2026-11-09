/**
 * Cycle de vie des URL.createObjectURL pour les photos enfant/élève.
 *
 * <p><b>Business :</b> chaque photo affichée a une URL locale ; elle doit être
 * libérée au remplacement, au rechargement et en quittant la page.
 * <p><b>Technique :</b> Map id → object URL + génération pour ignorer les blobs tardifs.
 * <p><b>Métier / flow :</b> GET photo → put ; destroy/invalidate → revoke.
 */
export class PhotoObjectUrlBag {
  private readonly urls = new Map<number, string>();
  private generation = 0;
  private alive = true;

  /** Invalide les chargements en cours et libère toutes les URL. */
  invalidate(): number {
    this.generation += 1;
    this.releaseAll();
    return this.generation;
  }

  ticket(): number {
    return this.generation;
  }

  isCurrent(ticket: number): boolean {
    return this.alive && ticket === this.generation;
  }

  get(id: number): string | undefined {
    return this.urls.get(id);
  }

  /** Crée une URL ; révoque l'ancienne pour le même id. Null si le bag est mort. */
  put(id: number, blob: Blob): string | null {
    if (!this.alive) {
      return null;
    }
    const previous = this.urls.get(id);
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    const url = URL.createObjectURL(blob);
    this.urls.set(id, url);
    return url;
  }

  /** Applique put seulement si le ticket est encore valide. */
  putIfCurrent(ticket: number, id: number, blob: Blob): string | null {
    if (!this.isCurrent(ticket)) {
      return null;
    }
    return this.put(id, blob);
  }

  snapshot(): Record<number, string> {
    return Object.fromEntries(this.urls.entries());
  }

  destroy(): void {
    this.alive = false;
    this.generation += 1;
    this.releaseAll();
  }

  private releaseAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }
}
