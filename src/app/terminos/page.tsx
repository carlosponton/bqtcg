import type { Metadata } from "next";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  MIN_AGE,
  SITE_NAME,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: `Condiciones de uso de ${SITE_NAME}.`,
};

export default function TerminosPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Términos y Condiciones
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Última actualización: {LEGAL_UPDATED}
      </p>

      <h2>1. Qué es {SITE_NAME}</h2>
      <p>
        {SITE_NAME} es una plataforma comunitaria que conecta a personas
        interesadas en <strong>vender, comprar o intercambiar</strong> cartas de
        Pokémon TCG en Barranquilla y su área metropolitana, y en marcar cartas
        que están buscando. La plataforma <strong>solo pone en contacto</strong> a
        los usuarios; la negociación, el pago y la entrega ocurren directamente
        entre ellos, por WhatsApp o en persona.
      </p>

      <h2>2. La plataforma no participa en las transacciones</h2>
      <ul>
        <li>
          No procesamos pagos, no custodiamos dinero ni cartas y no ofrecemos
          garantía, seguro ni servicio de intermediación (escrow).
        </li>
        <li>
          No verificamos la autenticidad, el estado ni la titularidad de las
          cartas publicadas.
        </li>
        <li>
          Cualquier acuerdo, disputa o incumplimiento es responsabilidad
          exclusiva de las personas involucradas.
        </li>
      </ul>

      <h2>3. Quién puede usarla</h2>
      <p>
        Debes tener al menos {MIN_AGE} años. Entre {MIN_AGE} y 18 años necesitas
        la autorización de tu padre, madre o representante legal, quien acepta
        estos términos en tu nombre. Al registrarte declaras que la información
        que entregas es veraz y que la cuenta es personal.
      </p>

      <h2>4. Publicaciones y conducta</h2>
      <ul>
        <li>
          Publica solo cartas que posees y que puedes entregar. Los anuncios de
          venta o cambio requieren al menos una foto real de la carta.
        </li>
        <li>
          No se permite contenido engañoso, ofensivo, ilegal, spam, ni el uso de
          la plataforma para estafar.
        </li>
        <li>
          Eres responsable del contenido que publicas (textos y fotos) y nos
          autorizas a mostrarlo dentro de la plataforma.
        </li>
      </ul>

      <h2>5. Reputación y reportes</h2>
      <p>
        Tras un trato confirmado por ambas partes, cada una puede dejar una
        reseña de la otra. Puedes reportar anuncios o usuarios. Podemos ocultar
        contenido o suspender cuentas que incumplan estos términos, sin previo
        aviso cuando sea necesario para proteger a la comunidad.
      </p>

      <h2>6. Disponibilidad</h2>
      <p>
        El servicio se ofrece «tal cual», sin garantía de disponibilidad
        continua. Podemos cambiar, suspender o descontinuar funciones en
        cualquier momento.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, {SITE_NAME} y sus operadores no
        responden por daños derivados de las transacciones entre usuarios, de la
        imposibilidad de usar el servicio, ni del contenido publicado por
        terceros.
      </p>

      <h2>8. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra{" "}
        <Link href="/privacidad" className="underline underline-offset-2">
          Política de Tratamiento de Datos Personales
        </Link>
        .
      </p>

      <h2>9. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos; los cambios relevantes se avisarán en
        la plataforma. Para dudas: {CONTACT_EMAIL}.
      </p>
    </article>
  );
}
