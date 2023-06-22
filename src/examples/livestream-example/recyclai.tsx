/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useContext, useMemo } from "react";
import dynamic from "next/dynamic";
import { Dropdown } from "monday-ui-react-core";

const Button = dynamic(
  () => import("monday-ui-react-core").then((mod) => mod.Button),
  {
      loading: () => <p>Loading...</p>,
      ssr: false,
  }
);
const Loader = dynamic(
  () => import("monday-ui-react-core").then((mod) => mod.Loader),
  {
    ssr: false,
  }
);

import { AppContext } from "@/components/context-provider/app-context-provider";
import AiAppFooter from "@/components/ai-footer/ai-footer";
import { Send } from "monday-ui-react-core/icons";
import { useAiApi } from "@/hooks/useAiApi";
import useBoardColumns, {
  mapBoardColumnsToDropdownOptions,
  mapBoardColumnsToTagsOptions,
} from "@/hooks/useBoardColumns";
import { useSuccessMessage } from "@/hooks/useSuccessMessage";
import classes from "@/examples/livestream-example/styles.module.scss";
import { executeMondayApiCall } from "@/helpers/monday-api-helpers";
import { Modes } from "@/types/layout-modes";

import { showErrorMessage } from "@/helpers/monday-actions";
import useBoardGroups, {
  mapBoardGroupsToDropdownOptions,
} from "@/hooks/useBoardGroups";

type DropdownSelection = {
  id: string;
  value: string;
};

// @ts-ignore
async function getItemsAndColumnValues(selectedGroup, context, columnIds) {
  return await executeMondayApiCall(
    `query ($boardId:[Int], $columnIds:[String], $groupId: [String]) { boards (ids:$boardId) { groups(ids:$groupId) { items { id column_values (ids:$columnIds) { text id } } } } }`,
    {
      variables: {
        columnIds,
        boardId:
          context?.iframeContext?.boardId ??
          context?.iframeContext?.boardIds ??
          [],
        groupId: selectedGroup,
      },
    }
  );
}

const Recyclai = (): JSX.Element => {
  const context = useContext(AppContext);
  const [mode, setMode] = useState<Modes>(Modes.request);
  const sessionToken = context?.sessionToken ?? "";

  const aiApiStatus = useAiApi("/openai/prompts", sessionToken);

  const [outputColumn, setOutputColumn] = useState<any>();
  const [inputColumn, setInputColumn] = useState<any>();
  const [selectedGroup, setSelectedGroup] = useState<string>();

  const boardColumns = useBoardColumns(context);
  const boardColumnsForTagsComponent =
    mapBoardColumnsToTagsOptions(boardColumns);
  const boardColumnsForDropdownComponent =
    mapBoardColumnsToDropdownOptions(boardColumns);
  const boardGroups = useBoardGroups(context);
  const boardGroupsForDropdownComponent =
    mapBoardGroupsToDropdownOptions(boardGroups) ?? [];
  const canRenderInput = !!boardColumnsForTagsComponent;

  const [success, setSuccess] = useState<boolean>(false);
  const loading = aiApiStatus.loading || mode == Modes.response;
  const error = aiApiStatus.error;
  useSuccessMessage(success);

  function handleOutputColumnSelect(e: DropdownSelection) {
    setOutputColumn(e?.value);
  }

  function handleInputColumnSelect(e: DropdownSelection) {
    setInputColumn(e?.value);
  }

  function handleGroupSelect(e: DropdownSelection) {
    setSelectedGroup(e?.value);
  }

  const handleSend = useCallback(async () => {
    setMode(Modes.response);

    var itemColumnValuesFromMonday = await getItemsAndColumnValues(
      selectedGroup,
      context,
      [inputColumn.label]
    );
    console.log("itemColumnValuesFromMonday: ", itemColumnValuesFromMonday)
    var input = "Turn this phrase into a funny and engageable tweet: ";
    if (itemColumnValuesFromMonday.is_success) {
      const { items } = itemColumnValuesFromMonday.data.boards[0].groups[0];
      var prompts: string[] = items.map((item: any) => {
        return input + item.column_values.find((x: any) => x.id === 'long_text').text;
      });
      var itemIdsList: { id: string }[] =
        itemColumnValuesFromMonday?.data.boards[0].groups[0].items.map(
          (x: any) => x.id
        );
    } else {
      showErrorMessage("Failed getting column values from monday", 3000);
      setMode(Modes.request);
      return null;
    }
    console.log("prompts: ", prompts)
    console.log("itemIdsList: ", itemIdsList)
    const aiApiResponse = await aiApiStatus.fetchData({
      prompts: prompts, // or promptsWithColumnValues,
      items: itemIdsList,
      n: 1, // or itemsFromMonday.length
    });
    console.log("aiApiResponse: ", aiApiResponse);
    if (aiApiResponse.length === 0 || error) {
      showErrorMessage("Something went wrong", 3000);
      setMode(Modes.request);
    } else {
      // avoid GraphQL type errors on dev
      let boardId =
        !context?.iframeContext?.boardId &&
        context?.iframeContext?.boardIds !== null &&
        context?.iframeContext?.boardIds !== undefined
          ? context?.iframeContext?.boardIds[0]
          : context?.iframeContext?.boardId ??
            context?.iframeContext?.boardIds ??
            [];
      // update items on board
      let itemUpdates = aiApiResponse.map(
        async (result: { item: string; result: string }) => {
          return await executeMondayApiCall(
            `mutation ($column:String!,$boardId:Int!, $itemId:Int!, $value:String!) {change_simple_column_value (column_id:$column, board_id:$boardId, item_id:$itemId, value:$value) {id }}`,
            {
              variables: {
                column: outputColumn,
                boardId: boardId,
                itemId: parseInt(result.item),
                value: result.result,
              },
            }
          );
        }
      );
      let success = await Promise.all(itemUpdates);
      setSuccess(!!success);
      setMode(Modes.request);
    }
  }, [aiApiStatus, selectedGroup, context, outputColumn, error]);

  return (
    <div className={classes.main}>
      <div style={{ marginLeft: "auto", marginRight: "auto" }}>
        Turn your Bugs into Content:
      </div>
      <div className={classes.dropdownContainer}>
        <Dropdown
          options={boardGroupsForDropdownComponent}
          onChange={handleGroupSelect}
          placeholder="Select a group"
          size="small"
        />
        <div style={{ marginBottom: "4px" }} />
        <Dropdown
          options={boardColumnsForDropdownComponent}
          onChange={handleInputColumnSelect}
          placeholder={"Select an input column"}
          size="small"
        />
        <div style={{ marginBottom: "4px" }} />
        <Dropdown
          options={boardColumnsForDropdownComponent}
          onChange={handleOutputColumnSelect}
          placeholder={"Select an output column"}
          size="small"
        />
        <div style={{ marginBottom: "8px" }} />
      </div>
      <Button
        ariaLabel="Send"
        className={classes.sendButton}
        size={"small"}
        kind={Button.defaultProps?.kind}
        leftIcon={Send}
        onClick={handleSend}
        disabled={!(selectedGroup && outputColumn && inputColumn)}
      >
        {mode === Modes.response ? <Loader size={24} /> : "Create Posts"}
      </Button>
      <div className={classes.footer}>
        <AiAppFooter />
      </div>
    </div>
  );
};

export default Recyclai;
