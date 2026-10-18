export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({version:"2.0.0",game:"treasure-hunt",commit:process.env.VERCEL_GIT_COMMIT_SHA ?? null},
    {headers:{"Cache-Control":"no-store"}});
}
