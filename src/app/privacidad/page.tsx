import type { Metadata } from "next";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  MIN_AGE,
  SITE_NAME,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Tratamiento de Datos Personales",
  description: `Cómo ${SITE_NAME} trata tus datos personales (Ley 1581 de 2012).`,
};

export default function PrivacidadPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Política de Tratamiento de Datos Personales
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Última actualización: {LEGAL_UPDATED} · Ley 1581 de 2012 y Decreto 1377
        de 2013 (Colombia)
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es el operador de {SITE_NAME}. Canal de
        atención para consultas y reclamos: <strong>{CONTACT_EMAIL}</strong>.
      </p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> correo electrónico y, si inicias con Google,
          tu nombre y foto de perfil de Google.
        </li>
        <li>
          <strong>Perfil:</strong> nombre para mostrar, nombre de usuario,
          ciudad, biografía y —si decides compartirlo— tu número de WhatsApp.
        </li>
        <li>
          <strong>Actividad:</strong> tu colección, tus anuncios y fotos, tratos
          registrados, reseñas y reportes.
        </li>
        <li>
          <strong>Técnicos:</strong> datos mínimos de sesión y registros de uso
          para operar y proteger el servicio.
        </li>
      </ul>

      <h2>3. Para qué los usamos (finalidades)</h2>
      <ul>
        <li>Crear y administrar tu cuenta y tu perfil público.</li>
        <li>
          Publicar tus anuncios y colecciones y permitir que otros usuarios te
          contacten.
        </li>
        <li>
          Gestionar tratos, reputación (reseñas) y reportes de la comunidad.
        </li>
        <li>
          Enviarte avisos dentro de la plataforma y, si los activas, por correo.
        </li>
        <li>Prevenir fraude, abuso y usos que violen los Términos.</li>
      </ul>

      <h2>4. Con quién se comparten</h2>
      <ul>
        <li>
          <strong>Otros usuarios:</strong> tu perfil, anuncios y colecciones
          marcadas como públicas son visibles para cualquiera. Tu WhatsApp solo
          se muestra a usuarios con sesión iniciada y solo si lo autorizaste.
        </li>
        <li>
          <strong>Encargados:</strong> Supabase (base de datos, autenticación y
          almacenamiento), Vercel (alojamiento) y Resend (envío de correos), que
          tratan los datos por cuenta nuestra y bajo estándares de seguridad.
        </li>
        <li>No vendemos tus datos personales.</li>
      </ul>

      <h2>5. Cookies y analítica</h2>
      <p>
        Usamos almacenamiento local del navegador solo para mantener tu sesión y
        preferencias. La analítica de uso es agregada y sin cookies de
        seguimiento.
      </p>

      <h2>6. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa y por el tiempo
        adicional que exija la ley o la atención de reclamos. Puedes solicitar la
        eliminación de tu cuenta escribiendo a {CONTACT_EMAIL}.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Como titular puedes <strong>conocer, actualizar y rectificar</strong> tus
        datos; solicitar prueba de la autorización; ser informado del uso;
        presentar quejas ante la Superintendencia de Industria y Comercio;{" "}
        <strong>revocar la autorización</strong> y <strong>solicitar la
        supresión</strong> cuando no exista un deber legal de conservarlos.
        Ejerce estos derechos escribiendo a {CONTACT_EMAIL}; responderemos en los
        plazos de ley (consultas: 10 días hábiles; reclamos: 15 días hábiles,
        prorrogables).
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        La plataforma está dirigida a personas de {MIN_AGE} años en adelante. El
        tratamiento de datos de menores se hace en su interés superior y requiere
        autorización de su representante legal.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Aplicamos medidas razonables (control de acceso por filas en la base de
        datos, cifrado en tránsito, permisos mínimos) para proteger tu
        información. Ningún sistema es 100% infalible.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política; los cambios relevantes se avisarán en
        la plataforma. Consulta también nuestros{" "}
        <Link href="/terminos" className="underline underline-offset-2">
          Términos y Condiciones
        </Link>
        .
      </p>
    </article>
  );
}
