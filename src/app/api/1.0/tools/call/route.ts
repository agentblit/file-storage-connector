import { NextResponse } from "next/server";
import { z } from "zod";
import { executeFileStorageTool } from "@/lib/file-storage/exec-tools";
import { requireWorkspaceApiKey } from "@/lib/auth/api-key-auth";

const toolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal("function"),
  function: z.object({
    name: z.string().optional().default(""),
    arguments: z.string().optional().default(""),
  }),
});

const bodySchema = z.object({
  tool_calls: z.array(toolCallSchema).min(1),
});

export async function POST(request: Request) {
  let workspaceId: string;
  try {
    const auth = await requireWorkspaceApiKey(request);
    workspaceId = auth.workspace.id;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    parsed.data.tool_calls.map(async (toolCall) => {
      const toolCallId = toolCall.id;
      const toolName = toolCall.function.name.trim();
      if (!toolName) {
        return {
          tool_call_id: toolCallId,
          error: "Missing tool name",
        };
      }

      let args: unknown = {};
      const rawArgs = toolCall.function.arguments?.trim() ?? "";
      if (rawArgs) {
        try {
          args = JSON.parse(rawArgs) as unknown;
        } catch {
          return {
            tool_call_id: toolCallId,
            error: "Tool arguments must be valid JSON",
          };
        }
      }

      try {
        const result = await executeFileStorageTool({
          workspaceId,
          toolName,
          args,
        });
        return {
          tool_call_id: toolCallId,
          result,
        };
      } catch (error) {
        return {
          tool_call_id: toolCallId,
          error: error instanceof Error ? error.message : "Tool call failed",
        };
      }
    }),
  );

  return NextResponse.json({ results });
}
